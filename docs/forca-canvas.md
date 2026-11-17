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
