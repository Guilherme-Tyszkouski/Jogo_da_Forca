# Login com Google no Cloudflare Pages — procedimento

Runbook do que foi feito neste projeto, escrito para ser seguido por qualquer
agente de IA ou por uma pessoa. Cada passo diz quem executa: **IA** (pode fazer
sozinha, inclusive navegando na tela) ou **PESSOA** (precisa de um humano, e o
agente para e pede).

Este arquivo descreve o procedimento. O agente `oauth-specialist` em
`.github/agents/` descreve as regras de quem escreve o código.

## Regra de segredos — vale o procedimento inteiro

Client Secret, tokens e chaves privadas nunca entram no chat, em arquivo
versionado, ou em captura de tela. O agente escreve o **nome** da variável
(`env.GOOGLE_CLIENT_SECRET`), nunca o valor.

Se um segredo aparecer no chat por engano, ele precisa ser **rotacionado** — não
basta apagar a mensagem.

Quando a tela do provedor exibir o segredo, o agente **não lê a página** e avisa
a pessoa para copiar.

O Client ID é público: aparece na URL de login que o navegador monta.

## 1. Publicar o site primeiro — IA orienta, PESSOA clica

O redirect do OAuth precisa da URL real, então o deploy vem antes do login.

No painel do Cloudflare, o Pages fica escondido atrás do fluxo de Workers. Link
direto: `https://dash.cloudflare.com/?to=/:account/pages/new/provider/github`

Build settings: preset None, build command vazio, **output directory = a pasta
do site** (`public`), nunca `/`. Publicar a raiz expõe `migrations/`, `scripts/`
e a configuração pela URL pública.

**Armadilha:** o nome do projeto no Pages não é o subdomínio. Um projeto
`jogo-da-forca` vira `jogo-da-forca-7de.pages.dev`. Confirme o nome real com
`npx wrangler pages project list` antes de usá-lo em qualquer comando — supor a
partir da URL dá `Project "..." does not exist`.

## 2. Criar o client OAuth — IA navega, PESSOA copia

Não existe API pública do Google para criar client OAuth comum: só para IAP. Os
pedidos no provider do Terraform estão abertos desde 2020. Este passo é manual
por limitação do Google, e é o único do procedimento que não automatiza.

O agente pode dirigir o navegador até preencher o formulário:
`https://console.cloud.google.com/auth/clients/create?project=<ID_DO_PROJETO>`
Tipo: Aplicativo da Web.

Origens JavaScript autorizadas:

    https://<projeto>.pages.dev
    http://localhost:8788

URIs de redirecionamento autorizados:

    https://<projeto>.pages.dev/api/auth/callback
    http://localhost:8788/api/auth/callback

Sem barra no fim. `https` em produção, `http` no local. O Google compara como
texto exato.

`8788` é a porta do `wrangler pages dev`. Cadastrar o local é o que permite
testar sem publicar a cada tentativa.

Criado o client, o agente para. A **PESSOA** copia Client ID e Client Secret.

**Armadilha:** `localhost` e `127.0.0.1` são endereços diferentes para o Google.
Abrir o site por `127.0.0.1` com `localhost` cadastrado dá
`redirect_uri_mismatch`.

## 3. Segredos — IA escreve o script, PESSOA cola os valores

- `.dev.vars` — segredos locais, **no `.gitignore`**
- `.dev.vars.example` — só os nomes, versionado
- Produção: `wrangler pages secret put`, nunca no `wrangler.toml`

Ver `scripts/configurar-segredos.mjs`. Ele cria o `.dev.vars` a partir do
modelo; **gera** a chave de sessão com `crypto.randomBytes(32)` (chave de
assinatura não vem de lugar nenhum, só precisa ser imprevisível); valida formato
sem imprimir valores (Client ID termina em `.apps.googleusercontent.com`; espaço
ou quebra de linha indica erro de colagem); e envia ao Cloudflare **por stdin**,
não como argumento — argumento fica no histórico do shell e na lista de
processos da máquina.

**Armadilha (Windows):** `spawn('npx.cmd')` falha com `EINVAL` no Node 20+, que
bloqueia executar `.cmd` sem shell. Em vez de `shell: true` — que submete os
argumentos às regras de aspas do `cmd` — chame o binário direto:
`spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...])`.

## 4. Banco D1 — IA faz

`npx wrangler d1 create <nome>` devolve o `database_id`, que não é segredo.

No `wrangler.toml`, `migrations_dir` vai **dentro** do bloco `[[d1_databases]]`.
No topo do arquivo o wrangler avisa `Unexpected fields` e ignora.

**Armadilha séria:** `migrations apply --local` **não valida** o `database_id`.
Com o campo em branco ou com um placeholder, ele cria as tabelas num banco local
identificado por aquele texto. Depois que o id correto entra, o `pages dev` abre
outro banco, vazio, e o sintoma é `no such table` numa Function que está certa.
Preencha o `database_id` antes do primeiro `--local`.

Sempre aplicar nos dois: `--local` e `--remote`. São bancos diferentes. Conferir
com `SELECT COUNT(*)` em cada um — é comum testar tudo no local, publicar, e o
site em produção responder com tabela vazia.

## 5. Código do fluxo — IA faz

Quatro endpoints em `functions/api/auth/`:

- `login` — gera `state` aleatório, manda no cookie e na URL do Google. Sem
  `state`, um site hostil induz o navegador a completar um login com a conta
  dele, e a pessoa joga achando que é a sua.
- `callback` — confere o `state`, troca o código por token servidor-a-servidor,
  valida `iss`, `aud` e `exp`, grava o usuário e cria a sessão.
- `eu` — quem está logado.
- `sair` — **POST**, nunca GET: com GET, uma imagem em qualquer site desloga a
  pessoa sem querer.

Chave do usuário: `(provedor, sub)`. Nunca e-mail — e-mail de conta Google pode
mudar, e aí a pessoa vira outro usuário no ranking.

Sessão: cookie assinado com HMAC-SHA256 (`HttpOnly`, `Secure`, `SameSite=Lax`,
validade explícita), não tabela. O cookie **não é criptografado**: qualquer um lê
o conteúdo. Só pode conter o que é público — id do usuário e expiração.

Verificação de assinatura do `id_token`: dispensável **apenas** quando o token
chega direto do endpoint do Google, por HTTPS, autenticado com o client secret,
sem passar pelo navegador. Se algum dia vier do cliente, verificar passa a ser
obrigatório.

Nunca registrar em log tokens, códigos ou cookies, nem truncados. Nunca aceitar
identidade vinda do corpo ou da query — ela sai sempre da sessão verificada.

## 6. Testar local — PESSOA roda e confirma

    npx wrangler pages dev

Abrir `http://localhost:8788/api/auth/login`, fazer o login, e conferir
`http://localhost:8788/api/auth/eu`.

Entrar no site só prova que o redirect aconteceu. O `eu` prova que o cookie
assinado foi gravado e lido de volta.

## Quem faz o quê

A IA faz: deploy guiado, navegação e preenchimento do formulário no Google, todo
o código, o script de segredos, a geração da chave de sessão, o banco e as
migrations, os testes que não exigem conta.

A PESSOA faz: aprovar a criação do client, copiar os dois valores do Google para
o `.dev.vars`, e fazer o login de verdade com a conta dela.

## Erros de credencial

`code: 7403` ("account is not valid or is not authorized") em comando `--remote`
quase sempre é token do `wrangler login` expirado, não dado corrompido. Refaça o
login e repita.
