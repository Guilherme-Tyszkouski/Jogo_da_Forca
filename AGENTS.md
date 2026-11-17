# Equipe de agentes — Jogo da Forca

Este arquivo define como os agentes de IA dividem o trabalho neste repositorio.
Ele vale para os agentes do Copilot em `.github/agents/`, e serve de referencia
para qualquer outro agente usado no projeto (Claude Code, OpenCode).

## Arquitetura alvo

- **Hospedagem:** Cloudflare Pages + Pages Functions.
- **Banco:** Cloudflare D1 (SQLite), acessado pelo binding `DB`.
- **Login:** OAuth 2.0 com Google (mesmo padrao do laboratorio anterior).
- **Multiplayer:** duelo assincrono. Dois jogadores recebem a mesma palavra,
  jogam separados, e o servidor compara erros e tempo. Mais um ranking geral.

### Regra de ouro da arquitetura

**A palavra sorteada nunca sai do servidor.**

Hoje o `script.js` guarda a palavra no navegador. Qualquer jogador abre o
DevTools e le a resposta. A partir da migracao para o backend:

- O cliente pede uma partida e recebe apenas: id da partida, quantidade de
  letras e categoria.
- O cliente envia uma letra; o servidor responde em quais posicoes ela aparece,
  ou que errou.
- A palavra completa so e devolvida quando a partida termina.

Qualquer mudanca que faca a palavra trafegar antes do fim da partida deve ser
rejeitada na revisao.

## Fronteiras de cada agente

Cada agente edita somente os caminhos da sua coluna. Se precisar de algo fora
do limite, descreve o que precisa no resumo em vez de editar.

| Agente | Pode editar | Nao edita |
|---|---|---|
| `frontend-developer` | `index.html`, `styles.css`, `public/**`, `src/client/**` | `functions/**`, `migrations/**`, `.github/workflows/**` |
| `frontend-reviewer` | nada (so revisa) | tudo |
| `backend-developer` | `functions/**`, `src/server/**` | `migrations/**`, `index.html`, `styles.css` |
| `backend-reviewer` | nada (so revisa) | tudo |
| `database-specialist` | `migrations/**`, `scripts/**` | `functions/**`, arquivos de interface |
| `devops-ci` | `.github/workflows/**`, `wrangler.toml`, `package.json` | codigo de aplicacao |
| `canvas-game-developer` | `forca-canvas/**`, `docs/forca-canvas.md` | `public/**`, `functions/**`, `migrations/**` |
| `css-architect` | `**/blocks/**`, `**/pages/**`, `**/vendor/**`, os `<link>` e as classes dos HTML | logica em JS, `functions/**`, `migrations/**` |

Observacoes sobre sobreposicao:
- `scripts/**` do `database-specialist` e a pasta `scripts/` da raiz. As pastas
  `forca-canvas/scripts/` e `public/scripts/` sao de `canvas-game-developer` e
  `frontend-developer`, respectivamente.
- Dentro de `forca-canvas/` e `public/`, o CSS (`blocks/`, `pages/`, `vendor/`)
  e do `css-architect`; o resto continua com o dono da pasta.
- Painel do `forca-canvas/` (Fase 3 do plano v2): o `frontend-developer` pode
  editar a estrutura do `forca-canvas/index.html` fora do palco (barra
  lateral, cabecalho, cards, botoes), `forca-canvas/scripts/painel.js`,
  `forca-canvas/scripts/dados-exemplo.js` e `forca-canvas/images/**`. O canvas
  e os scripts do jogo (`tema`, `estado`, `boneco*`, `piranha`, `palco`,
  `cenario`, `particulas`, `teclado`, `main`) continuam do
  `canvas-game-developer`.

## Padrao de codigo (obrigatorio)

Regra do Guilherme para **todos** os projetos, nao so este. Referencia:
repositorio `Guilherme-Tyszkouski/ERP-controle-de-estoque` (padrao TripleTen).
Detalhes e modelo de pastas em `docs/piranha-hangman-v2.md`, secao 2.

- Estrutura: `index.html` (so estrutura), `pages/index.css` (SO `@import`),
  `blocks/` (um arquivo por bloco BEM), `vendor/` (`normalize.css`,
  `fonts.css` so com `@font-face`, `fonts/*.woff2`), `scripts/`, `images/`.
- BEM: `bloco`, `bloco__elemento`, `bloco__elemento_modificador_valor`.
  Seletores so de classe: nada de `#id` nem de tag dentro dos blocos.
- Proibido: `<style>` no HTML, atributo `style=""` e CSS montado no
  JavaScript. O JS so liga e desliga classes.
  - Unica excecao (aprovada pelo Guilherme em 2026-11-16): para valores
    continuos que mudam a cada quadro (ex.: parallax seguindo o mouse), o JS
    pode escrever SO variaveis CSS com
    `elemento.style.setProperty("--tilt-x", valor)`. A propriedade que usa a
    variavel (`transform: rotateY(calc(var(--tilt-x) * 1deg))`) fica no bloco
    CSS. Escrever `elemento.style.transform`, `width` etc. continua proibido.
- Cores do tema: variaveis CSS no `:root` de `blocks/page.css`. As cores do
  canvas ficam num unico objeto em `scripts/tema.js`, com os mesmos valores.
  Nada de cor solta no codigo de desenho.
- HTML com um so `<link rel="stylesheet" href="./pages/index.css">`; scripts
  com `defer` no `<head>`, sem `type="module"` (abrir com dois cliques).
- `.editorconfig` (2 espacos, `lf`, `utf-8`) e `.prettierignore`
  (`vendor/normalize.css`) iguais aos do repositorio de referencia.
- O `css-architect` revisa todo CSS novo ou alterado.

### Orquestracao

Quando um agente orquestrador (Claude) coordena o trabalho, ele nao escreve
codigo: so distribui tarefas para os agentes acima, junta os resumos e registra
tudo na documentacao do modulo (ex.: `docs/forca-canvas.md`).

## Regras de segredo — valem para todos os agentes

1. Nenhum agente escreve o **valor** de um segredo em arquivo nenhum. Agente
   escreve o **nome** da variavel: `env.GOOGLE_CLIENT_SECRET`.
2. Segredos locais ficam em `.dev.vars`, que esta no `.gitignore`.
3. Segredos de producao ficam no Cloudflare, via `wrangler secret put` ou pelo
   painel. Quem digita o valor e a pessoa, nunca o agente.
4. Se um agente encontrar um segredo commitado, ele para, avisa, e nao tenta
   corrigir sozinho — a chave precisa ser rotacionada antes de qualquer coisa.
5. O `Client ID` do Google e publico e pode ficar no `wrangler.toml`. O
   `Client Secret` nao.

## Regra de honestidade

Nenhum agente afirma que testou algo que nao executou. Se nao rodou o teste,
escreve "nao validado" no resumo. Um agente que diz "funcionando" sem evidencia
custa mais tempo do que um que admite a duvida.

## Ordem de trabalho sugerida

1. `database-specialist` cria o esquema e carrega o dicionario.
2. `backend-developer` escreve as Functions de partida e de login.
3. `backend-reviewer` revisa com foco em segredo vazado, SQL injection e na
   regra de ouro acima.
4. `frontend-developer` troca o array local pelas chamadas a API.
5. `frontend-reviewer` confere acessibilidade e teclado.
6. `devops-ci` fecha o workflow de CI e o deploy.

## Procedimentos registrados

- `docs/oauth-cloudflare.md` — como configurar o login com Google e o D1 neste
  tipo de projeto, do deploy ao login funcionando, com as armadilhas que ja
  custaram tempo e marcando quais passos exigem uma pessoa.

Qualquer agente que for mexer em autenticacao, segredos ou banco le esse arquivo
antes de comecar.
