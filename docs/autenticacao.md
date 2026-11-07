# Autenticação

## Onde cada coisa fica

| O quê | Onde | Por quê |
| --- | --- | --- |
| Access token (JWT, 15 min) | só em memória (`TokenStorageService`) | some ao recarregar a página; não fica gravado em disco |
| Refresh token (7 dias, uso único) | cookie **httpOnly** gravado pelo back, com `Path=/api/auth` | o JavaScript não consegue ler o cookie, então um script malicioso na página não consegue roubá-lo |
| Marca de sessão | `localStorage` (`golduck.session`) | não é segredo: avisa o guard e as outras abas de que existe sessão |

Login, refresh e logout vão com `withCredentials: true`, para o navegador mandar e receber o cookie.

## Login

1. `POST /auth/login` com e-mail e senha.
2. O back devolve o access token no corpo e grava o refresh token no cookie.
3. O front guarda o access token em memória, marca a sessão e busca o usuário (`GET /auth/me`) para o topo.

## Em cada requisição (`core/auth/auth.interceptor.ts`)

- Manda `Authorization: Bearer <access token>` nas rotas protegidas (não manda nas públicas: login, refresh,
  `/version` e `/health/live`).
- Se o token em memória vai vencer em menos de 30 segundos (ou não existe, depois de um F5), renova antes.
- Se o back responder 401, renova e repete a requisição uma vez.

## Renovação (`AuthService.refreshAccessToken`)

- `POST /auth/refresh` **sem corpo**: o navegador manda o cookie sozinho, e o back devolve um access token novo
  e grava um cookie novo (rotação).
- **Uma renovação por vez**: várias requisições ao mesmo tempo esperam a mesma chamada, e entre abas uma trava
  (Web Locks API) impede duas renovações. Isso importa porque o back troca o refresh token a cada uso e encerra
  a sessão se um token velho for reutilizado.
- Recusada pelo back (400/401): "Sua sessão expirou. Entre novamente." e volta ao login, lembrando a página.
- Limitada pelo back (429): a sessão continua e o front espera o `Retry-After` antes de tentar de novo.
- Falha de rede: a sessão continua; a próxima requisição tenta de novo.

## Guards (`core/auth/auth.guard.ts`)

- `authGuard`: telas logadas. Sem sessão, vai para `/login?redirect=<página pedida>`.
- `guestGuard`: o login. Com sessão, vai para a página inicial.

Os guards olham só a marca de sessão; se ela estiver velha, a primeira chamada à API descobre e leva ao login.

## Sair

`POST /auth/logout` com o cookie (e o access token, mesmo vencido, sem renovar antes). Com resposta ou sem,
o front limpa a sessão e volta ao login. Logout e login feitos em outra aba são acompanhados por esta
(evento `storage`).

## Proteções que dependem do back

- **CSRF**: o back só aceita login, refresh e logout vindos de uma origem confiável. O endereço do front
  precisa estar em `API_CORS_ORIGINS` no back (local: `http://localhost:4200`).
- **Cookie entre domínios**: para o cookie funcionar em todos os navegadores (o Safari bloqueia cookies de
  outro site), front e API precisam ficar no mesmo site: domínio próprio com a API num subdomínio (ex.:
  `app.exemplo.com` e `api.exemplo.com`) ou a API servida pelo próprio domínio do front (rewrite de `/api` na
  Vercel). Dois endereços `*.vercel.app` diferentes contam como sites diferentes.
- **Força bruta**: o back limita tentativas por IP e por e-mail; o front mostra a mensagem com o tempo de
  espera.

Testes: `core/auth/*.spec.ts` (renovação única, 401, 429, logout com token vencido, cookie, guards e abas).
