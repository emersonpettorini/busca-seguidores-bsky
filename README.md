# Busca de perfis no Bluesky

Página estática, sem servidor e sem build. Um arquivo: `index.html`.

## Modos de busca

- **quem postou** — perfis que publicaram algo com o termo
- **seguidores de** — seguidores de um perfil
- **bio contém** — perfis com o termo na bio
- **sigo, mas não me seguem** — quem você segue e não retribui, com a data em que você seguiu

Filtros comuns a todos: faixa de seguidores, faixa de seguindo, diferença percentual
entre os dois, data inicial do último post e limite de perfis listados. Dá para seguir
e deixar de seguir na própria lista, individualmente ou em massa.

## Rodar localmente

Abra o `index.html` no navegador. Para entrar automaticamente:

```bash
cp config.example.js config.js
```

e preencha com uma [app password](https://bsky.app/settings/app-passwords) — nunca a
senha da conta. Sem `config.js`, a página mostra o formulário de login.

## Publicar online

`config.js` **não pode ir junto**: é texto puro e daria acesso à sua conta a quem
baixasse o arquivo. Ele já está no `.gitignore`. Publicado sem ele, cada pessoa entra
com a própria app password, guardada apenas no navegador de quem usa — não há backend.

Qualquer host de arquivos estáticos serve. Sem git, o caminho mais curto é arrastar a
pasta para o [Netlify Drop](https://app.netlify.com/drop). Com git, GitHub Pages ou
Cloudflare Pages. Em todos, o HTTPS vem de graça — e é obrigatório, já que a página
recebe senha.

## Testes

```bash
node test-boot.mjs
```

Roda o script real do `index.html` num DOM mínimo, com a rede simulada. Aceita um fuso
como argumento (`node test-boot.mjs Asia/Tokyo`), porque o filtro de data depende disso.
