import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runUnfollow } from './auto-unfollow.mjs';

const now = new Date('2026-08-30T12:00:00Z');
const account = { handle: 'eu.bsky.social', appPassword: 'senha-de-teste' };
const followedAt = {
  oldest: '2026-07-01T10:00:00Z',
  mutual: '2026-07-10T10:00:00Z',
  old: '2026-08-15T10:00:00Z',
  recent: '2026-08-29T10:00:00Z',
};

const mock = () => {
  const calls = [];
  const fetchFn = async (input, options = {}) => {
    const url = new URL(input);
    const path = url.pathname.split('/').pop();
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ path, url, body });
    const ok = data => new Response(JSON.stringify(data), { status: 200 });
    if (path === 'com.atproto.server.createSession')
      return ok({ did: 'did:plc:me', handle: 'eu.bsky.social', accessJwt: 'token' });
    if (path === 'com.atproto.repo.listRecords') return ok({
      records: Object.entries(followedAt).map(([name, createdAt]) => ({
        uri: `at://did:plc:me/app.bsky.graph.follow/${name}`,
        value: { subject: `did:plc:${name}`, createdAt },
      })),
    });
    if (path === 'app.bsky.actor.getProfiles') return ok({
      profiles: url.searchParams.getAll('actors').map(did => ({
        did, handle: did.split(':').pop() + '.bsky.social',
        viewer: {
          following: `at://did:plc:me/app.bsky.graph.follow/${did.split(':').pop()}`,
          ...(did === 'did:plc:mutual' && { followedBy: 'at://them/follow/me' }),
        },
      })),
    });
    if (path === 'com.atproto.repo.deleteRecord') return ok({});
    return new Response('{}', { status: 404 });
  };
  return { calls, fetchFn };
};

const directory = await mkdtemp(join(tmpdir(), 'auto-unfollow-test-'));
try {
  {
    const api = mock();
    const result = await runUnfollow({
      account, now, fetchFn: api.fetchFn, recordHistory: false,
      statePath: join(directory, 'dry-state.json'),
    });
    assert.equal(result.mode, 'dry-run');
    assert.equal(result.graceDays, 7);
    assert.equal(result.maxUnfollows, 50);
    assert.deepEqual(result.candidates.map(item => item.handle),
      ['oldest.bsky.social', 'old.bsky.social']);
    assert.equal(api.calls.some(call => call.path === 'com.atproto.repo.deleteRecord'), false);
    console.log('ok 1 - seleciona apenas nao seguidores antigos, do follow mais velho ao mais novo');
  }

  {
    const api = mock();
    const statePath = join(directory, 'execute-state.json');
    const result = await runUnfollow({
      account, now, fetchFn: api.fetchFn, execute: true, maxUnfollows: 1,
      sleepFn: async () => {}, recordHistory: false, statePath,
    });
    assert.deepEqual(result.unfollowed.map(item => item.handle), ['oldest.bsky.social']);
    const writes = api.calls.filter(call => call.path === 'com.atproto.repo.deleteRecord');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].body.rkey, 'oldest');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(state.unfollowed['did:plc:oldest'].handle, 'oldest.bsky.social');
    console.log('ok 2 - limita o lote, remove o mais antigo e persiste a exclusao');
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}

console.log('\ntodos passaram');
