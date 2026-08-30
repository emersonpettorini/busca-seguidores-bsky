# Busca de perfis no Bluesky

Página estática, sem servidor e sem build de produção. A aplicação fica no `index.html`;
os outros arquivos são configuração local, testes e preparação segura da publicação.

## Modos de busca

- **quem postou** — perfis que publicaram algo com o termo
- **posts recentes em português** — perfis que publicaram qualquer coisa marcada como português nos últimos X minutos
- **seguidores de** — seguidores de um perfil
- **bio contém** — perfis com o termo na bio
- **sigo, mas não me seguem** — quem você segue e não retribui, com a data em que você seguiu

Filtros comuns a todos: faixa de seguidores, faixa de seguindo, diferença percentual
entre os dois, data inicial do último post e limite de perfis listados. O modo de posts
recentes usa o idioma declarado no próprio post e aceita uma janela positiva em minutos. Dá para seguir
e deixar de seguir na própria lista, individualmente ou em massa.

## Follow automático periódico

O `auto-follow.mjs` procura posts marcados como português nos últimos 60 minutos,
mantém apenas perfis cujos seguidores estejam dentro de 10% da quantidade de contas
que seguem e limita cada execução a 20 follows. A própria conta, perfis já seguidos e
perfis bloqueados ficam de fora. Entre cada follow há uma pausa aleatória de 10 a 30
segundos para reduzir o risco de limite da API.

Primeiro rode em simulação, que não segue ninguém:

```bash
npm run auto-follow:dry-run
```

Para efetivar os follows:

```bash
npm run auto-follow
```

Cada execução é registrada localmente em `auto-follow-history.jsonl`, arquivo ignorado
pelo Git. A primeira conta válida do `config.js` é usada. Para escolher outra ou ajustar
os limites, defina `AUTO_FOLLOW_HANDLE`, `AUTO_FOLLOW_WINDOW_MINUTES`,
`AUTO_FOLLOW_RATIO_PCT` ou `AUTO_FOLLOW_MAX_FOLLOWS` no ambiente.

### Execução na nuvem

O workflow `.github/workflows/auto-follow.yml` executa a automação no GitHub Actions
no minuto 17 de cada hora e também pode ser iniciado manualmente. Ele lê o handle e a
app password dos Secrets `BSKY_HANDLE` e `BSKY_APP_PASSWORD`; nenhuma credencial fica
no repositório ou nos arquivos publicados pelo GitHub Pages. As execuções usam somente
permissão de leitura do conteúdo e não podem se sobrepor.

Na mesma execução, `auto-unfollow.mjs` remove no máximo 20 perfis que não seguem a
conta de volta. Só entram perfis seguidos há pelo menos 7 dias, sempre do follow mais
antigo em direção ao mais recente. Um estado persistente no cache do Actions impede
que o follow automático volte a adicionar quem acabou de ser removido. O estado contém
somente DIDs, handles e datas — nunca tokens ou app passwords.

## Rodar localmente

Abra o `index.html` no navegador. Para entrar automaticamente:

```bash
cp config.example.js config.js
```

e preencha com uma [app password](https://bsky.app/settings/app-passwords) — nunca a
senha da conta. Sem `config.js`, a página mostra o formulário de login. Os tokens da
sessão ficam no `sessionStorage`: sobrevivem a recargas, mas são apagados ao fechar a aba.

## Publicar online

`config.js` **não pode ir junto**: é texto puro e daria acesso à sua conta a quem
baixasse o arquivo. O `.gitignore` protege commits, mas não protege quando uma pasta é
arrastada manualmente para um serviço de hospedagem.

Gere sempre o pacote público limpo:

```bash
node prepare-publish.mjs
```

O comando recria `dist/` apenas com o `index.html` e um `config.js` público vazio.
Confira a mensagem do comando e envie **somente o conteúdo de `dist/`**. Nunca arraste
a pasta inteira do projeto.

Qualquer host de arquivos estáticos serve. Sem git, arraste apenas `dist/` para o
[Netlify Drop](https://app.netlify.com/drop). Com git, GitHub Pages ou Cloudflare Pages
também servem, desde que a raiz publicada seja o pacote limpo. Em todos, use HTTPS,
porque a página recebe a app password diretamente no navegador.

## Testes

```bash
node test-boot.mjs
```

Roda o script real do `index.html` num DOM mínimo, com a rede simulada. Aceita um fuso
como argumento (`node test-boot.mjs Asia/Tokyo`), porque o filtro de data depende disso.

Há também um smoke test opcional em Chromium real:

```bash
npm install
npx playwright install chromium
npm run test:browser
```

As dependências são apenas de desenvolvimento; a pasta publicada continua contendo
somente HTML e o `config.js` público vazio.
