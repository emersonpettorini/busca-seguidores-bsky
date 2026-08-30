import assert from 'node:assert/strict';
import { dentroDaProporcao, runAutomation } from './auto-follow.mjs';

assert.equal(dentroDaProporcao(80, 100, 20), true);
assert.equal(dentroDaProporcao(120, 100, 20), true);
assert.equal(dentroDaProporcao(79, 100, 20), false);
assert.equal(dentroDaProporcao(121, 100, 20), false);
assert.equal(dentroDaProporcao(undefined, 100, 20), false);
console.log('ok 1 - proporcao de 20% inclui os limites e rejeita contagens ausentes');

const profiles = {
  'did:plc:a': { did: 'did:plc:a', handle: 'a.bsky.social', followersCount: 90, followsCount: 100, viewer: {} },
  'did:plc:b': { did: 'did:plc:b', handle: 'b.bsky.social', followersCount: 120, followsCount: 100,
    viewer: { following: 'at://me/app.bsky.graph.follow/b' } },
  'did:plc:c': { did: 'did:plc:c', handle: 'c.bsky.social', followersCount: 10, followsCount: 100, viewer: {} },
  'did:plc:d': { did: 'did:plc:d', handle: 'd.bsky.social', followersCount: 100, followsCount: 100,
    viewer: { blockedBy: true } },
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
    if (path === 'app.bsky.feed.searchPostsV2') return ok({ posts: [
      { indexedAt: '2026-08-30T12:59:00Z', author: { did: 'did:plc:a' }, record: { langs: ['pt'] } },
      { indexedAt: '2026-08-30T12:58:00Z', author: { did: 'did:plc:a' }, record: { langs: ['pt-BR'] } },
      { indexedAt: '2026-08-30T12:57:00Z', author: { did: 'did:plc:b' }, record: { langs: ['pt-BR'] } },
      { indexedAt: '2026-08-30T12:56:00Z', author: { did: 'did:plc:c' }, record: { langs: ['pt'] } },
      { indexedAt: '2026-08-30T12:55:00Z', author: { did: 'did:plc:d' }, record: { langs: ['pt'] } },
      { indexedAt: '2026-08-30T12:54:00Z', author: { did: 'did:plc:x' }, record: { langs: ['en'] } },
    ] });
    if (path === 'app.bsky.actor.getProfiles')
      return ok({ profiles: url.searchParams.getAll('actors').map(did => profiles[did]).filter(Boolean) });
    if (path === 'com.atproto.repo.createRecord') return ok({ uri: 'at://me/app.bsky.graph.follow/new' });
    return new Response('{}', { status: 404 });
  };
  return { calls, fetchFn };
};

const account = { handle: 'eu.bsky.social', appPassword: 'app-password-de-teste' };
const now = new Date('2026-08-30T13:00:00Z');

{
  const api = mock();
  const result = await runAutomation({ account, now, fetchFn: api.fetchFn, recordHistory: false });
  assert.equal(result.mode, 'dry-run');
  assert.deepEqual(result.candidates.map(item => item.handle), ['a.bsky.social']);
  assert.equal(result.followed.length, 0);
  assert.equal(api.calls.some(call => call.path === 'com.atproto.repo.createRecord'), false);
  const search = api.calls.find(call => call.path === 'app.bsky.feed.searchPostsV2').url;
  assert.equal(search.searchParams.get('languages'), 'pt');
  assert.equal(search.searchParams.get('since'), '2026-08-30T12:00:00.000Z');
  console.log('ok 2 - simulacao filtra idioma, janela, proporcao, seguidos e bloqueados');
}

{
  const api = mock();
  const result = await runAutomation({
    account, now, fetchFn: api.fetchFn, execute: true, maxFollows: 1,
    sleepFn: async () => {}, recordHistory: false,
  });
  assert.deepEqual(result.followed.map(item => item.handle), ['a.bsky.social']);
  const writes = api.calls.filter(call => call.path === 'com.atproto.repo.createRecord');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body.record.subject, 'did:plc:a');
  console.log('ok 3 - execucao respeita o limite e cria o follow correto');
}

console.log('\ntodos passaram');
