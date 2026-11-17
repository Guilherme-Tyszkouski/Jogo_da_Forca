# Forca em Canvas — diario do modulo

Pasta: `forca-canvas/`. Laboratorio pequeno para refazer o desenho da forca em
Canvas (hoje o jogo usa SVG). Quando estiver pronto, entra no jogo principal.

Objetivo de carreira: Canvas, laco de jogo e animacao sao o que vagas de dev de
jogos web (ex.: Jungle Gaming) pedem.

## Plano por noites

| Noite | Entrega | Status |
|---|---|---|
| 1 | Laco do jogo: quadrado andando com `dt` | Feito |
| 2 | Estados do jogo (jogando/ganhou/perdeu), forca e boneco desenhados, palavra e teclado | Feito (validado no Playwright; falta o Guilherme testar no navegador dele) |
| 3 | Piranha voadora come uma parte do boneco a cada erro (ideia do Guilherme) | Feito (validado no Playwright; falta o Guilherme testar no navegador dele) |
| 4 | Integracao com o jogo principal (`/api/partida`, regra de ouro do AGENTS.md) | A fazer |

## Quem faz o que

- Orquestrador (Claude): distribui as tarefas e mantem este arquivo.
- `canvas-game-developer`: escreve o codigo em `forca-canvas/`.
- `frontend-reviewer`: revisa (so le, nao edita).

## Registro

### 2026-11-16 — Noite 1
- Feito: `forca-canvas/index.html` (canvas 400x300) e `forca-canvas/jogo.js`.
- `jogo.js` tem estado do quadrado, `atualizar(dt)`, `desenhar()` e o laco com
  `requestAnimationFrame`. `Math.min(dt, 0.1)` evita teleporte ao trocar de aba.
- Validado pelo Guilherme no navegador: o quadrado anda e volta nas paredes.
- Criado o agente `canvas-game-developer` (`.github/agents/canvas-game-developer.agent.md`, movido de `docs/`
  na v2) e a linha dele
  no `AGENTS.md`.

### 2026-11-16 — Noite 2
- Feito por `canvas-game-developer`: forca jogavel, toda desenhada no canvas.
- `index.html`: canvas 600x400 com `aria-label`, instrucao visivel ("Digite
  letras no teclado...") e um `<p id="status" aria-live="polite">` escondido
  da tela que o leitor de tela anuncia.
- `jogo.js`:
  - Lista local `PALAVRAS` com 14 palavras e categoria (so para o laboratorio;
    no jogo real a palavra fica no servidor, regra de ouro do `AGENTS.md`).
  - Objeto `estado`: `palavra`, `categoria`, `certas`, `erradas`, `erros`,
    `maxErros = 6`, `fase` ("jogando" | "ganhou" | "perdeu").
  - Logica separada do desenho: `novaPartida()`, `chutar(letra)`,
    `palavraCompleta()`, `verificarFim()`, `avisar(texto)`.
  - Teclado: `keydown`, so A-Z, ignora tecla segurada (`evento.repeat`) e letra
    ja chutada. Enter so comeca nova partida quando a fase e ganhou/perdeu.
  - Desenho: `desenharForca()`, `desenharBoneco()` (cabeca com `arc`, corpo,
    bracos e pernas conforme `erros`), `desenharPalavra()`, `desenharInfo()`
    (categoria, erros, letras erradas) e `desenharMensagem()` (caixa de
    ganhou/perdeu; ao perder mostra a palavra; "Enter para jogar de novo").
  - Laco igual ao da Noite 1 (`Math.min(dt, 0.1)`); `atualizar(dt)` esta vazio,
    reservado para a animacao da Noite 3.
- Validacao (executada pelo agente):
  - `node --check jogo.js`: sem erro de sintaxe.
  - Playwright (Chromium headless) abrindo o arquivo por `file://`: acertou
    todas as letras -> fase "ganhou"; letra depois do fim foi ignorada; Enter
    -> nova partida; 6 letras erradas -> fase "perdeu" com a palavra mostrada;
    7o erro ignorado; Enter reinicia. Letra ja chutada apertada de novo e as
    teclas "1" e Shift nao contaram erro. (Tecla segurada, `evento.repeat`, nao
    foi simulada.)
    Nenhum erro no console. O texto do `aria-live` mudou a cada jogada.
  - Nao validado: teste no navegador do Guilherme e com leitor de tela real.

### 2026-11-16 — Noite 2 — correcoes da revisao
- Revisao do `frontend-reviewer`; correcoes feitas por `canvas-game-developer`.
- Corrigido em `jogo.js`:
  - Teclas com Ctrl/Alt/Meta (Ctrl+F, Alt+Z...) sao ignoradas.
  - Avisos do `aria-live` agora dizem quantas vezes a letra aparece, a palavra
    (`textoPalavra()`, ex.: "A _ A _ A _ _") e as letras erradas.
  - Letra repetida avisa "Voce ja tentou a letra X.".
  - `avisar()` apaga e escreve de novo apos 50 ms (frase igual e relida).
  - Largura da letra: `Math.min(36, (tela.width - 40) / tamanho)`, fonte
    proporcional.
  - `estado.erros` removido; agora e a funcao `erros()` (tamanho de `erradas`).
  - Nova partida nunca repete a palavra anterior.
  - Comentarios sem citar "Noite 2/3".
  - Teclado na tela: 26 `<button>` criados por `criarTeclado()`, chamando o
    mesmo `chutar(letra)`; `atualizarTeclado()` trava letra usada e pinta de
    verde (certa) ou vermelho riscado (errada). Botao "Nova partida" aparece so
    no fim. `reiniciar()` so cria partida se a atual acabou (Enter e botao
    usam a mesma funcao).
- Corrigido em `index.html`: `box-sizing: border-box`, canvas com
  `width: min(600px, calc(100vw - 32px)); height: auto`, `role="img"` e
  `aria-describedby="status"` no canvas, teclado com `role="group"`.
- Observacao: o teclado na tela e HTML (entrada do jogo), o desenho do jogo
  continua todo no canvas.
- Validacao (executada pelo agente):
  - `node --check jogo.js`: ok.
  - Playwright/Chromium headless, desktop: Ctrl+F, Alt+Z e Meta+letra nao
    contaram; avisos de acerto/erro/repetida com o texto esperado; ganhar,
    Enter reinicia com palavra diferente; 30 reinicios seguidos sem repetir a
    anterior; perder com 6 erros. Sem erros no console.
  - Playwright a 360x740 (toque): `scrollWidth` = 360 (sem rolagem
    horizontal), canvas com 328px, 26 botoes; toque marca certa/errada e trava;
    6 toques errados -> perdeu, teclado travado, "Nova partida" visivel; tocar
    nele reinicia e libera as 26 letras. Captura: `noite2-v2.png` no scratchpad.
  - Nao validado: celular de verdade e leitor de tela real.
- Pendente: a 360px o canvas fica com ~55% do tamanho, entao os textos menores
  do canvas (ex.: "Enter para jogar de novo") ficam pequenos (~10px).

### 2026-11-16 — Noite 3 — piranha voadora
- Ideia do Guilherme: o conceito foi invertido. O boneco comeca INTEIRO na
  forca e, a cada erro, uma piranha voadora entra voando, morde a proxima
  parte e sai. 6 erros = boneco todo comido = perdeu.
- Decisao: personagem ORIGINAL em vez de um conhecido. Usar personagem de jogo
  famoso (ex.: o circulo amarelo de boca em fatia) seria problema de direito
  autoral num projeto de portfolio publico e nao mostraria criatividade. A
  piranha e feita so com formas simples: corpo oval roxo (`ellipse`), cauda em
  forquilha e barbatana (triangulos), um olho, mandibula de baixo para fora
  (queixo pra frente) com dentes brancos triangulares.
- Feito por `canvas-game-developer` em `jogo.js` (o `index.html` nao mudou):
  - `PARTES`: as 6 partes como dados (linha ou circulo, com nome para o aviso).
  - Estado da animacao separado da regra: `boneco.escala` (1 = inteira,
    0 = comida), `boneco.tempoPulo` e o objeto `piranha`.
  - Maquina de estados `atualizarPiranha(dt)`: "parada" -> "entrando" (voa de
    fora da tela ate a parte, 600 px/s, alternando o lado) -> "mordendo" (0,6 s;
    a boca abre e fecha 5 vezes por segundo com `Math.sin`; a parte encolhe e
    fica transparente de 1 ate 0; solta 8 migalhas com gravidade) -> "saindo"
    (segue ate sair pelo outro lado) -> "parada".
  - Fila `piranha.fila`: erros rapidos esperam a vez, entao todo erro aparece.
  - Balanco no ar com `Math.sin(tempo * 8)`; ao ganhar, o boneco da pulinhos.
  - A regra marca "perdeu" na hora (entrada bloqueada), mas a caixa de fim
    (`mostrandoMensagem()`), as letras vermelhas da palavra, o botao "Nova
    partida" e o Enter so funcionam depois da ultima mordida
    (`fimDasMordidas()`).
  - Aviso: "Errou: nao tem D. A piranha comeu a cabeca. ..." e, no fim, "Voce
    perdeu. A piranha comeu o boneco inteiro. A palavra era ...".
  - Texto pequeno no celular corrigido: menor fonte do canvas agora e 24px
    (a 360px de largura vira ~13px; antes ~10px). Caixa de fim maior.
- Validacao (executada pelo agente):
  - `node --check jogo.js`: ok.
  - Playwright/Chromium headless, desktop: boneco comeca inteiro; erro dispara
    a piranha ("entrando"); durante "mordendo" a cabeca estava com escala 0,58;
    depois da mordida a cabeca sumiu e o resto ficou inteiro; 2 erros rapidos
    -> 1 voando + 1 na fila, comidas na ordem 0, 1, 2; com o 6o erro a fase
    virou "perdeu" sem caixa nem botao, letra e Enter ignorados; a caixa so
    apareceu com a 6a parte em 0 e a piranha parada; Enter reiniciou com o
    boneco inteiro; ao ganhar o pulinho rodou e a caixa apareceu.
  - Playwright a 360x740 (toque): sem rolagem horizontal (`scrollWidth` 360),
    toque errado fez a piranha comer a cabeca.
  - Nenhum erro no console. Capturas no scratchpad: `noite3-mordendo.png`,
    `noite3-perdeu.png`, `noite3-mobile.png`.
  - Nao validado: celular de verdade, leitor de tela real, e se a animacao fica
    suave (headless nao mede fluidez).
- Pendente: o aviso de erro diz "a piranha comeu" na hora do chute, antes da
  animacao terminar; a piranha passa por cima do texto da direita ao voar.

### 2026-11-16 — Noite 3 — correcoes da revisao
- Revisao do `frontend-reviewer` (11 achados, nenhum critico); correcoes
  feitas por `canvas-game-developer` em `jogo.js` e `index.html`.
- Alto — fila de erros rapidos: 6 erros seguidos travavam o fim por ~11,4 s
  (Enter e botao mudos). Agora, se ha fila ao fim de "mordendo", a piranha nao
  sai: vai direto para a proxima parte (`irPara()`, `comecarMordida()`,
  `terminarVoo()`). Medido: 4,9 s do 6o erro ate o botao.
- Medio:
  - Aviso do erro agora diz "A piranha vai comer a cabeca" (antes dizia
    "comeu" antes da mordida). Resolve o 1o "Pendente" da Noite 3.
  - Vitoria com a piranha voando: avisa so "Voce ganhou! A palavra era X.";
    o "Aperte Enter ou o botao Nova partida." vem em `fimDasMordidas()`, nos
    dois resultados.
  - Foco: no fim vai para o botao "Nova partida"; ao reiniciar vai para a
    letra A.
  - `prefers-reduced-motion` (`MOVIMENTO_REDUZIDO`): piranha aparece direto
    na parte e some ao terminar; sem balanco, migalhas e pulinho. A boca
    continua mastigando (decisao do agente: movimento pequeno e no lugar).
- Baixo:
  - Saida com alvo fixo `piranha.saidaY = -80` (antes dependia do FPS).
  - A piranha vem sempre pela esquerda e sai subindo por cima; nao alterna
    mais o lado (`piranha.mordidas` removido). Nao passa mais pelo texto da
    direita (x maximo medido 171; texto comeca em 290). Resolve o 2o
    "Pendente".
  - Pulinho da vitoria so comeca depois da ultima mordida.
  - `dt = Math.max(0, Math.min(dt, 0.1))` (dt negativo no 1o quadro).
  - Caixa de fim: "Enter ou o botao para jogar de novo".
  - `index.html`: `.certa`/`.errada` com `opacity: 1` (contraste era 4,30:1).
- Bug novo achado no teste e corrigido: com foco no botao "Nova partida", o
  Enter reiniciava pelo `keydown`, o foco ia para a letra A e o clique do
  Enter chutava A. Agora o `keydown` so reinicia se o alvo nao for um BUTTON;
  com foco num botao, o clique do proprio botao reinicia.
- Validacao (executada pelos agentes):
  - `node --check jogo.js`: ok (conferido tambem pelo orquestrador).
  - Playwright com o Chrome do sistema em headless, por `file://`: 6 partes
    terminam com escala 0; textos dos 6 avisos; foco ao perder (teclado e
    clique) e ao reiniciar; Enter no fim com foco no botao e no BODY reinicia
    sem chutar letra; vitoria com piranha voando (botao escondido, Enter
    ignorado, pulinho parado ate o fim); reduced-motion emulado (piranha ja
    "mordendo", 0 migalhas, 6 erros em 3,6 s); 360px sem rolagem horizontal;
    sem erros no console. Capturas no scratchpad: `n3c-voo.png`, `n3c-fim.png`.
  - Nao validado: navegador do Guilherme, celular real, leitor de tela real,
    reduced-motion ligado de verdade no sistema, tecla segurada.
- Pendente: ao clicar numa letra na tela, o botao fica desabilitado e o foco
  cai no BODY (vem da Noite 2). Proxima rodada: mover o foco para a proxima
  letra livre.

## Piranha Hangman v2 (plano em `docs/piranha-hangman-v2.md`)

### 2026-11-16 — Preparacao (secao 1 e 2.5 do plano)
- Feito pelo orquestrador (Claude): branch `feature/piranha-hangman-v2`
  criada e enviada; commit `3309d68` salva as Noites 1-3; commit `6d9b9e3`
  move `canvas-game-developer.agent.md` para `.github/agents/`, cria o agente
  `css-architect`, acrescenta a linha dele e a secao "Padrao de codigo
  (obrigatorio)" no `AGENTS.md`, e traz o `.editorconfig` do repositorio
  ERP-controle-de-estoque. `.prettierignore` usa `**/vendor/normalize.css`
  (aqui ha duas pastas `vendor/`).
- Decisao do Guilherme: excecao ao "JS so liga classes" para valores
  continuos (parallax): o JS escreve so variaveis CSS com
  `style.setProperty("--parallax-x", x)`; o `transform` fica no CSS.
  Registrada no `AGENTS.md` e na secao 9 do plano.

### 2026-11-16 — Fase 1: refactor de estrutura e CSS (sem mudar comportamento)
- `forca-canvas/`:
  - `css-architect`: `<style>` saiu do HTML; `pages/index.css` so com
    `@import`; blocos `page`, `stage`, `keyboard`, `button`,
    `visually-hidden` (o antigo `.so-leitor`); `vendor/normalize.css`
    (8.0.1), `vendor/fonts.css` e `vendor/fonts/inter.woff2` + licenca OFL.
    Cores viraram variaveis no `:root` com os nomes da paleta 3.3, mas com os
    valores de hoje (a paleta nova entra na Fase 3). Inter declarado, ainda
    nao aplicado.
  - `canvas-game-developer`: `jogo.js` dividido em `scripts/` (`tema.js`,
    `estado.js`, `boneco.js`, `piranha.js`, `palco.js`, `teclado.js`,
    `main.js`), carregados com `defer` no `<head>`, sem `type="module"`. Toda
    cor do desenho foi para o objeto `COR` em `tema.js`. Os listeners agora
    ficam em `ligarTeclado()`, chamado pelo `main.js`; nada roda antes dele.
    JS usa `keyboard__key`, `keyboard__key_state_correct` e `_wrong`.
- `public/`:
  - `css-architect`: `styles.css` (854 linhas) virou 30 blocos BEM em
    `blocks/`, 234 seletores so de classe; um `<link>` so; normalize e Inter
    como acima. Estados por atributo viraram classes (`page_screen_solo`,
    `segmented__option_state_checked`, `icon-button_state_pressed`).
  - `frontend-developer`: classes novas aplicadas em `script.js` e
    `multiplayer.js`; parallax trocado pelas variaveis `--parallax-x/y`
    (unicos `.style` do projeto); tamanho do `dustCanvas` foi para o CSS;
    scripts movidos para `public/scripts/` com `defer` no `<head>`.
- Validacao (executada pelos agentes, Chrome headless):
  - `forca-canvas/`: com a mesma palavra sorteada, 0 pixels diferentes contra
    a referencia `6d9b9e3` (6 capturas, 1280 e 360); teste da Noite 3 igual
    (6 erros ate o botao: 4905 ms x 4909 ms; avisos, foco, Enter,
    reduced-motion, 360px).
  - `public/`: 14 cenarios x 2 tamanhos (sem API e com `/api` simulado):
    26 de 28 capturas com 0 px; as 2 da sala de espera diferem ~105 px, que e
    o spinner (mesmo ruido entre duas capturas do baseline). Sem erros de JS.
  - Conferido pelo orquestrador: zero `<style>`/`style=""` nos dois HTML;
    `pages/index.css` so com `@import`; blocos so com seletores de classe;
    `node --check` em todos os scripts; nenhum segredo nos arquivos.
  - Nao validado: backend real (Functions), hover/foco, outros navegadores,
    celular real, leitor de tela, abrir por dois cliques num navegador real.
- Pendente (bugs antigos achados e confirmados, NAO corrigidos porque a Fase
  1 nao muda comportamento — corrigir numa fase aprovada pelo Guilherme):
  - A inclinacao do cartao solo nunca aparece: a animacao `game-arrive`
    (`fill: both`) prende o `transform` do `.game`.
  - Depois de um duelo, o chute no solo pinta a tecla do duelo:
    `guess()` usa `document.querySelector('[data-letter=X]')` e o
    `#keyboardDuelo` vem antes do `#keyboard` no DOM.
  - `forca-canvas/`: medidas do desenho ainda estao espalhadas (so as cores
    foram para `tema.js`); foco cai no BODY ao clicar letra (Noite 3).

### 2026-11-17 — Fase 2: Palco v2
- Feito por `canvas-game-developer` (secoes 4.5 e 5 do plano):
  - Cenario: forca na margem de um lago (`scripts/cenario.js`); canvas
    600x440. Particulas (migalhas, respingos, suor) em `scripts/particulas.js`.
  - Devoracao de baixo para cima: perna esq, perna dir, braco esq, braco dir,
    tronco, cabeca. Parte comida vira osso cinza; a cabeca, contorno
    tracejado.
  - Boneco (`boneco.js` + `boneco-desenho.js`): `balancando`, `panico`
    (olhos arregalados, grito, suor, bracos para cima, joelhos dobrados),
    `aliviado` (corda solta, cai com gravidade NA MARGEM e comemora),
    `devorado`.
  - Piranha (`piranha.js`): `nadando`, `bote` (salto a 900 px/s),
    `mordendo` (0,5 s; particulas; tremida de 6 px por 0,2 s), `recuando`
    (com fila, salta de novo direto), `indo_embora` (na vitoria).
  - Fim da partida por um sinal so, `estado.fimAnunciado`, ligado quando a
    partida acabou e `animando()` e falso.
  - Opcao "Tremer a tela" (checkbox, lembrada no localStorage em try/catch);
    desligada com `MOVIMENTO_REDUZIDO`.
  - Cores novas da paleta 3.3 no objeto `COR` de `tema.js`; medidas do
    cenario no objeto `MEDIDA`.
- Decisao (plano 4.5, troca a da Noite 3): o aviso da mordida sai QUANDO A
  MORDIDA TERMINA ("Piranha mordendo! Perna esquerda devorada."). No chute,
  so "Errou: nao tem D...". `#status` virou `role="log"`: `avisar()`
  acrescenta um `<p>` (guarda os 3 ultimos), entao um aviso nao apaga o
  outro. O mesmo recado aparece desenhado embaixo do lago.
- `css-architect`: bloco `blocks/settings.css` (area de toque de 44px, foco
  visivel, aviso `settings__hint` embaixo); `--color-text-muted` (#9a9a9a,
  6,71:1) em `page.css`.
- Revisao do `frontend-reviewer`: nada critico/alto; 3 medios e 7 baixos,
  todos corrigidos pelo `canvas-game-developer`:
  - M1: vitoria era anunciada duas vezes com mordidas na fila. Decisao do
    orquestrador: a fila termina (erros = partes comidas) e "Voce ganhou" e
    anunciado uma vez, em `fimDasMordidas()`, como a derrota.
  - M2: com reduced-motion o checkbox usa `aria-disabled` (alcancavel por
    Tab) e mostra "Desligado: seu sistema pede menos movimento."
    (`aria-describedby`).
  - M3: no fim, o foco so vai para "Nova partida" se estava no `body` ou no
    teclado; o botao carrega o resultado por `aria-describedby="resultado"`.
  - Baixos: foco ao digitar a letra do botao focado; balanco suave
    (`0.05 + 0.07 * medo`) e giro da queda com dt; canvas sem
    `aria-describedby` do historico; comentarios do `tema.js` corrigidos;
    `tremer()` virou `comecarTremida()`; `prepararPalco()` zera as animacoes;
    `boneco.js` dividido (186 + 128 linhas).
- Validacao (executada pelos agentes, Chrome headless por `file://`):
  - Uma captura por estado das duas maquinas (scratchpad `fase2/` e
    `fase2-correcoes/`).
  - 6 erros rapidos ate o botao: 4661 ms; aviso de cada mordida no mesmo
    quadro em que a parte some.
  - Vitoria com 3 mordidas na fila: "Voce ganhou" uma vez, no fim (4100 ms);
    boneco pousa na margem (pes em y 232, cabeca em x 112-115; a agua comeca
    em x 140).
  - Tremida 6 px ligada / 0 desligada; reduced-motion: 6 erros em 3044 ms,
    0 particulas, Tab chega no checkbox.
  - 360px sem rolagem horizontal; nenhum erro no console.
  - Conferido pelo orquestrador: zero `<style>`/`style=""`, `pages/index.css`
    so `@import`, so seletores de classe, nenhuma cor fora de `tema.js`,
    nenhum `.style`, `node --check` nos 10 scripts.
  - Nao validado: navegador do Guilherme, leitor de tela real (NVDA,
    VoiceOver), Firefox/Safari, celular real, reduced-motion real no sistema,
    fluidez da animacao.
- Pendente:
  - Mudar a preferencia de movimento com a pagina aberta nao e detectado
    (`MOVIMENTO_REDUZIDO` e lido so no carregamento).
  - Com reduced-motion, `bote` e `recuando` acontecem no mesmo quadro.
  - Textos do canvas ficam com ~13px no celular.
  - Os 2 bugs antigos do `public/` registrados na Fase 1.

### 2026-11-17 — Fase 3: layout do painel (dados de exemplo)
- O Guilherme mandou seguir para a Fase 3 na mesma sessao. Decisao do
  orquestrador (secao 9 do plano): o painel fica no `forca-canvas/` com dados
  de exemplo; o `frontend-developer` ganhou acesso a estrutura do painel ali
  (registrado no `AGENTS.md`).
- `frontend-developer`: `index.html` reorganizado (todos os ids do jogo
  mantidos); barra lateral `<aside class="sidebar">` (Home, Jogar com
  submenu, Ranking, Historico, Perfil; perfil e "Sair" na base), recolhivel
  com `«` (lembrada no localStorage) e menu sobreposto abaixo de 640px
  (modal: `inert` no resto e foco preso; Esc, clique fora e escolha fecham);
  cabecalho; cards Historico (tabela com caption e `th scope`), Liga semanal
  e Temas. `scripts/dados-exemplo.js` (ficticios; so "Tyszkowski" e real) e
  `scripts/painel.js` (funcao auto-executavel, `textContent`, sem
  `innerHTML`). 15 SVGs originais em `images/`. "Jogar" leva a `#jogo` sem
  recarregar a partida.
- `canvas-game-developer`: fileira de letras chutadas `#chutadas`
  (`role="group"`, ordem do chute, ", certa"/", errada" para leitor de tela);
  `COR` do `tema.js` alinhado a paleta 3.3 (texto vermelho `#E36363`, porque
  `#E05252` da 4,34:1 no palco); canvas sem a lista "Letras erradas" e com
  textos maiores (16,8px efetivos a 360px); teclado fisico ignora foco na
  barra, no cabecalho, em links e campos (o checkbox da tremida continua
  valendo, e do jogo).
- `css-architect`: blocos `sidebar`, `header`, `profile`, `card`, `guessed`;
  `button_style_primary` e `_outline`; paleta 3.3 no `:root` (+
  `--color-danger-text #e36363`) e Inter; grade de 3 colunas, cards abaixo
  do palco < 1024px, menu < 640px (mesmo breakpoint do `painel.js`),
  cabecalho preso no celular; teclado por container query (7/9/13 por
  linha); `@media (forced-colors: active)` para letras, teclas, link ativo,
  status e cadeado.
- Revisao do `frontend-reviewer`: nada critico/alto; 2 medios
  (letra certa/errada so por cor; estados sumindo em alto contraste) e 10
  baixos. Corrigidos: letra errada riscada; forced-colors; `role="group"`;
  menu modal; barra como landmark; cabecalho preso; seletor que cruzava
  blocos trocado por mix `profile__name sidebar__label`; submenu escondido
  com a barra recolhida; tabela sem rolagem a 320px; lista duplicada fora do
  canvas. Ficaram como estao (aceitaveis): teclas de 39px a 320px.
- Validacao (executada pelos agentes, Chrome headless): capturas em 1280,
  1024, 640, 360 e 320, barra recolhida, menu aberto com a pagina rolada e
  forced-colors emulado; `scrollWidth` igual a largura em todas; contrastes
  >= 4,5:1 (texto escuro no verde 7,59; letra errada riscada 4,73); testes do
  painel e do menu passando; regressao da Fase 2 ok (6 erros: 4689 ms).
  Conferido pelo orquestrador: pagina real sem erro nem arquivo faltando em
  1280 e 360; zero `<style>`/`style=""`; so seletores de classe; nenhuma cor
  fora do `:root`/`tema.js`; `node --check` em todos os scripts.
- Nao validado: alto contraste real do Windows (o headless so ativa a media
  query), leitor de tela real, Firefox/Safari, celular real, zoom real.
- Pendente:
  - Cabecalho preso ocupa ~107px a 360px e cobre o comeco do palco ao rolar
    (encurtar ou esconder as instrucoes no celular?).
  - Links Home, Ranking, Historico e Perfil sao `href="#"`; "Sair" nao faz
    nada (Fase 5).
  - Divergencias aceitas do mockup: botao "Proxima partida" so no fim; pais
    como sigla; 26 teclas com as usadas coloridas.
