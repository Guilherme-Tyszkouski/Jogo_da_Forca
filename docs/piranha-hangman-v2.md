# Piranha Hangman v2 — briefing e ordens para o Claude no terminal

> **Como usar:** abra o terminal na pasta do projeto, rode `claude` e mande:
> "Leia o `docs/piranha-hangman-v2.md` inteiro e execute a partir da seção 1."
>
> Mockup de referência: `docs/referencias/mockup-piranha-v2.jpg`.

---

## 0. Regras desta sessão (valem do começo ao fim)

1. **Você é só o orquestrador.** Não escreve código. Distribui as tarefas para
   os agentes do `AGENTS.md`, cria agentes novos quando precisar, junta os
   resumos e revisa se a entrega bate com este documento.
2. **Tudo é documentado.** Cada fase concluída ganha uma entrada datada no
   `docs/forca-canvas.md` (o que foi feito, por quem, o que foi validado e o
   que ficou pendente). Decisões novas entram neste arquivo, na seção 9.
3. **Nada na `main`.** Todo o trabalho acontece na branch da seção 1.
4. **Padrão de CSS obrigatório** (seção 2) em todo arquivo novo ou alterado.
   Isso é regra do Guilherme para **todos** os projetos, não só este.
5. **Regra de honestidade do `AGENTS.md`:** se não rodou o teste, escreve
   "não validado".
6. **Fim da sessão:** salvar tudo no Segundo Cérebro (seção 8).

---

## 1. Branch nova antes de qualquer alteração

Hoje está tudo na `main`, inclusive arquivos ainda não commitados
(`forca-canvas/`, `docs/forca-canvas.md`, `AGENTS.md`). Ordem:

```bash
git status                                  # ver o que está pendente
git switch -c feature/piranha-hangman-v2    # a branch leva as mudanças pendentes junto
git add forca-canvas docs AGENTS.md
git commit -m "chore: salva laboratorio forca-canvas (noites 1-3) antes do refactor"
git push -u origin feature/piranha-hangman-v2
```

- Um commit por fase, com mensagem no padrão `tipo: descricao`
  (`feat`, `fix`, `refactor`, `style`, `docs`, `chore`).
- **Não fazer merge na `main` sem o Guilherme aprovar.** No fim, abrir um Pull
  Request da branch para a `main` e deixar para ele revisar.
- Se algo quebrar: `git log --oneline` mostra o último commit bom, e dá para
  voltar só aquele arquivo com `git restore --source <commit> <arquivo>`.

**Pendência pequena:** mover `docs/canvas-game-developer.agent.md` para
`.github/agents/canvas-game-developer.agent.md` (a sessão anterior não tinha
permissão para gravar em `.github/`).

---

## 2. Padrão obrigatório de estrutura e CSS

Referência: repositório `Guilherme-Tyszkouski/ERP-controle-de-estoque`.
O padrão é o da TripleTen: BEM, um arquivo CSS por bloco e um arquivo de
página que só faz `@import`.

### 2.1 Estrutura de pastas (aplicar em `forca-canvas/` e em `public/`)

```
forca-canvas/                  (e o mesmo dentro de public/)
├── index.html                 só estrutura; um <link> e os <script defer>
├── pages/
│   └── index.css              SÓ @import, nenhuma regra solta
├── blocks/                    um arquivo por bloco BEM
│   ├── page.css
│   ├── sidebar.css
│   ├── header.css
│   ├── stage.css              o palco (canvas)
│   ├── keyboard.css           teclado de letras
│   ├── button.css
│   ├── card.css               widgets laterais (histórico, liga, temas)
│   ├── profile.css
│   └── visually-hidden.css    o antigo .so-leitor
├── vendor/
│   ├── normalize.css
│   ├── fonts.css              só @font-face
│   └── fonts/                 arquivos .woff2
├── scripts/
│   ├── main.js                liga tudo
│   ├── estado.js              regras do jogo (sem desenho)
│   ├── palco.js               laço do jogo e desenho no canvas
│   ├── piranha.js             estados e desenho da piranha
│   ├── boneco.js              estados e desenho do boneco
│   ├── teclado.js             teclado na tela e teclado físico
│   └── tema.js                cores e medidas usadas no canvas
└── images/                    svg e png
```

### 2.2 `pages/index.css`: modelo exato

```css
@import url(../vendor/normalize.css);
@import url(../vendor/fonts.css);
@import url(../blocks/page.css);
@import url(../blocks/sidebar.css);
@import url(../blocks/header.css);
@import url(../blocks/stage.css);
@import url(../blocks/keyboard.css);
@import url(../blocks/button.css);
@import url(../blocks/card.css);
@import url(../blocks/profile.css);
@import url(../blocks/visually-hidden.css);
```

### 2.3 `vendor/fonts.css`: só `@font-face`

```css
@font-face {
  font-family: "Inter";
  src: url("./fonts/inter.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

### 2.4 Regras que valem para todo o projeto

- **Proibido:** `<style>` dentro do HTML, atributo `style=""`, e CSS montado
  no JavaScript. O JS só **liga e desliga classes**
  (`elemento.classList.add("keyboard__key_state_wrong")`).
- **BEM:** `bloco`, `bloco__elemento`, `bloco__elemento_modificador_valor`
  (ex.: `keyboard__key`, `keyboard__key_state_correct`). Os seletores são só
  de classe: nada de `#id` nem de tag dentro dos blocos.
- **Um bloco = um arquivo** em `blocks/`, com o mesmo nome da classe.
- **Cores do tema:** ficam como variáveis CSS (custom properties) em
  `blocks/page.css`, no `:root`. O canvas não lê CSS, então as cores dele ficam
  num único objeto em `scripts/tema.js`, com os mesmos valores. É proibido
  espalhar cor solta pelo código de desenho.
- **HTML:** um só `<link rel="stylesheet" href="./pages/index.css">`. Os
  scripts vão com `defer` no `<head>`, sem `type="module"`, para continuar
  abrindo com dois cliques.
- **`.editorconfig` e `.prettierignore`** iguais aos do repositório de
  estoque: 2 espaços, `lf`, `utf-8` e `vendor/normalize.css` ignorado pelo
  Prettier.
- Gravar essa regra no `AGENTS.md`, numa seção "Padrão de código (obrigatório)",
  e no Segundo Cérebro como padrão global (seção 8).

### 2.5 Agente novo: `css-architect`

Criar `.github/agents/css-architect.agent.md`:

- **Pode editar:** `**/blocks/**`, `**/pages/**`, `**/vendor/**`, e os `<link>`
  e as classes dos HTML.
- **Faz:** migra o CSS para o padrão acima e revisa todo CSS novo (BEM,
  `@import`, nada inline).
- **Não edita:** a lógica em JS nem `functions/**`.
- Acrescentar a linha dele na tabela de fronteiras do `AGENTS.md`.

---

## 3. Briefing melhorado: o produto

### 3.1 Visão

Um jogo da forca competitivo para a web, em que **uma piranha devora o boneco
parte por parte** a cada erro. A interface é um painel em modo escuro, inspirado
na *organização* de plataformas de jogos competitivos como o Chess.com: barra
lateral, cards e ranking.

- **Só inspiração:** não usar o nome, o logo, os ícones nem copiar telas do
  Chess.com.
- **Identidade própria:** nome "Piranha Hangman" (ou outro que o Guilherme
  escolher) e paleta própria.
- **Público:** portfólio para vagas de dev de jogos web. O destaque técnico é o
  **Canvas com laço de jogo, máquina de estados e animação por `dt`**.

### 3.2 O que muda em relação ao briefing original (e por quê)

| Briefing original | Versão melhorada | Motivo |
|---|---|---|
| Firebase ou Supabase | **Manter Cloudflare Pages + Functions + D1 + OAuth Google** | Já existe e funciona no projeto (`functions/api/auth`, `functions/api/salas`, `migrations/0005_salas_ao_vivo.sql`). Trocar seria refazer tudo |
| SVG ou Canvas | **Canvas** | É o que as vagas pedem, e as Noites 1 a 3 já foram feitas em Canvas |
| React opcional | **JS puro por enquanto** | O Guilherme ainda não usa frameworks; precisa conseguir explicar cada linha |
| Piranha "nadando na parte inferior" | **Forca montada sobre um lago**; a piranha nada na água e **salta** para morder | Explica por que uma piranha alcança um boneco pendurado e deixa a animação mais forte |
| Rating "sobe e desce" | **Elo simples calculado no servidor** (seção 6) | Fórmula definida evita discussão; cálculo no cliente permitiria trapaça |
| Todos os recursos de uma vez | **Fases com critério de pronto** (seção 7) | O escopo é grande; as fases garantem que sempre exista uma versão jogável |

### 3.3 Paleta (tokens)

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#161512` | fundo da página |
| `--color-stage` | `#1E1E24` | fundo do palco |
| `--color-card` | `#262421` | cards e barra lateral |
| `--color-primary` | `#81B64C` | botão principal, letra certa |
| `--color-danger` | `#E05252` | alerta, letra errada |
| `--color-text` | `#EDEDED` | texto |
| `--color-text-muted` | `#9A9A9A` | texto secundário |
| `--color-water` | `#2B6CB0` | lago no palco |
| `--color-piranha` | `#8B3FD9` | piranha padrão |

---

## 4. Interface (layout do mockup)

1. **Barra lateral fixa** (`sidebar`): Home, Jogar (submenu Solo e
   Multiplayer), Ranking, Histórico e Perfil. Na base ficam o avatar, o nick,
   o indicador online e o botão Log Out. Pode ser recolhida (`«`); no celular
   vira um menu que abre por cima da tela.
2. **Coluna central:**
   - o **palco** (canvas) com a mensagem de status embaixo (ex.: "PIRANHA
     MORDENDO! Perna esquerda devorada!");
   - as **letras já chutadas** (verde para certa, vermelho para errada);
   - o **teclado A–Z**;
   - o botão verde **"Próxima partida"**.
3. **Coluna direita (cards):**
   - **Histórico de partidas:** jogadores, rating, resultado, precisão e data;
   - **Liga semanal:** top 3 e a posição do jogador;
   - **Temas:** grade de miniaturas com os temas que o jogador já liberou.
4. **Responsivo:**
   - abaixo de 1024px, os cards descem para baixo do palco;
   - abaixo de 640px, a barra lateral vira menu e o teclado ocupa a largura toda;
   - não pode haver rolagem horizontal a 360px.
5. **Acessibilidade:** a mensagem do palco também vai para um `aria-live`. Esse
   aviso sai **quando a mordida termina**, e não na hora do chute (isso corrige
   a pendência da Noite 3). Os botões têm foco visível, e o teclado físico e o
   de toque funcionam os dois.

---

## 5. O palco: mecânica e animações (Canvas)

### 5.1 Cenário

Forca de madeira na margem de um lago. O boneco fica pendurado pela corda, com
os pés pouco acima da água, e a piranha nada no lago.

### 5.2 Ordem da devoração (de baixo para cima)

1. Perna esquerda
2. Perna direita
3. Braço esquerdo
4. Braço direito
5. Tronco
6. Cabeça: **game over**

O boneco continua vivo e reagindo até o último erro. A parte devorada deixa um
**osso ou contorno tracejado** no lugar.

### 5.3 Máquinas de estado (todas com `dt`)

**Boneco:**

| Estado | O que acontece |
|---|---|
| `balancando` | balanço leve na corda (`Math.sin`), rosto neutro |
| `panico` | ao errar: olhos arregalados, boca gritando, gotas de suor saindo; braços para cima; encolhe a perna que sobrou |
| `aliviado` | ao ganhar: a corda solta, ele cai **na margem, não na água**, e comemora |
| `devorado` | depois da última mordida |

**Piranha:**

| Estado | O que acontece |
|---|---|
| `nadando` | vai e volta na água |
| `bote` | dash rápido até a parte alvo |
| `mordendo` | abre e fecha a boca; respingos e migalhas (partículas); tremida de tela de 0,2 s |
| `recuando` | volta para a água levando a parte |
| `indo_embora` | quando o jogador vence |

- Erros rápidos ficam numa **fila de mordidas** (já existe na Noite 3).
- A tela de fim só aparece depois da última animação (também já existe).
- **Tremida de tela:** deslocar o desenho todo alguns pixels, diminuindo com
  `dt`. Precisa de uma opção para desligar.

### 5.4 Personagem original

A piranha é original, feita com formas simples, e **não pode lembrar nenhum
personagem de jogo conhecido** (decisão registrada no `docs/forca-canvas.md`).
Os temas trocam cores e acessórios dela, nunca para virar um personagem
existente.

---

## 6. Modos, ranking e dados

### 6.1 Modos

- **Solo:** partida rápida por categoria (Fruta, Animais, Países...). Conta para
  a sequência diária (streak) e **não mexe no rating**.
- **Duelo simultâneo 1v1:** os dois jogadores recebem a mesma palavra. Vence quem
  completar primeiro; se ninguém completar, vence quem tiver mais partes
  intactas. Usar a estrutura de salas que já existe em `functions/api/salas/`.
- **Modo Carrasco:** um jogador digita a palavra e a categoria, e o outro tenta
  sobreviver.
  - A palavra é validada no dicionário do D1 e **fica só no servidor**.
  - O carrasco vê a palavra; o adversário nunca a recebe antes do fim.
- **Sala privada:** convite por link (já existe o `entrar.js`).

### 6.2 Regra de ouro (do `AGENTS.md`), estendida

- A palavra nunca chega ao cliente do jogador que está adivinhando antes do fim
  da partida.
- **Rating, precisão e resultado são calculados no servidor.** O cliente nunca
  envia "eu ganhei".

### 6.3 Rating (Elo simples)

- Rating inicial **400**.
- Pontuação esperada: `E = 1 / (1 + 10^((Rb - Ra) / 400))`.
- Rating novo: `Ra' = Ra + K * (S - E)`, com `K = 32` e `S` = 1 (vitória),
  0,5 (empate) ou 0 (derrota).
- Rating mínimo de 100.

### 6.4 Precisão

`precisão = letras certas ÷ letras chutadas`, em porcentagem, por partida.

### 6.5 Ligas semanais (fase final)

- Ligas: Madeira, Bronze, Prata, Ouro e Diamante.
- Grupos de até 30 jogadores. Toda segunda-feira, os 5 primeiros sobem e os 5
  últimos descem.
- O fechamento roda num Cron Trigger do Cloudflare.

### 6.6 Tabelas novas no D1 (para o `database-specialist`)

- `perfis`: `usuario_id`, `nick`, `pais`, `avatar_tema`, `rating`, `streak`,
  `ultimo_dia_jogado`, `liga_id`.
- `partidas_historico`: `id`, `modo`, `jogador_a`, `jogador_b`, `vencedor`,
  `erros_a`, `erros_b`, `precisao_a`, `precisao_b`, `rating_delta_a`,
  `rating_delta_b`, `criada_em`.
- `ligas` e `liga_membros`: semana, divisão e pontos.
- `temas` e `temas_liberados`: o tema e o critério para liberar (ex.: 600
  troféus).

---

## 7. Fases (uma por vez, cada uma com commit e entrada no diário)

| Fase | Entrega | Agentes | Critério de pronto |
|---|---|---|---|
| 1 | **Refactor de estrutura e CSS** do `forca-canvas/` e do `public/` no padrão da seção 2, **sem mudar o comportamento** | `css-architect`, `canvas-game-developer`, `frontend-developer` | Zero `<style>` e zero `style=""`; `pages/index.css` só com `@import`; o jogo funciona igual a antes (Playwright) |
| 2 | **Palco v2:** lago, ordem de baixo para cima, estados do boneco (pânico, aliviado), bote da piranha, osso no lugar da parte, tremida de tela, aviso sincronizado com o fim da mordida | `canvas-game-developer` → `frontend-reviewer` | Todas as máquinas da seção 5.3 funcionando; capturas de cada estado |
| 3 | **Layout do painel** (barra lateral, coluna central, cards) com dados de exemplo | `frontend-developer`, `css-architect` → `frontend-reviewer` | Fica como o mockup; responsivo em 1280, 1024, 640 e 360px |
| 4 | **Integrar o palco ao jogo real** (`/api/partida`, `/api/chute`) | `frontend-developer` + `backend-developer` → `backend-reviewer` | A palavra não aparece no DevTools antes do fim |
| 5 | **Perfil e histórico** (tabelas + Functions + cards com dados reais) | `database-specialist`, `backend-developer`, `frontend-developer` | Partida jogada aparece no histórico com precisão |
| 6 | **Rating Elo + página de Ranking** | `backend-developer` → `backend-reviewer` | Elo calculado no servidor; testes da fórmula |
| 7 | **Modo Carrasco** | `backend-developer`, `frontend-developer` → `backend-reviewer` | Palavra validada no dicionário e escondida do adversário |
| 8 | **Ligas semanais** (Cron Trigger) | `database-specialist`, `devops-ci`, `backend-developer` | Promoção e rebaixamento simulados em ambiente local |
| 9 | **Temas liberáveis** | `canvas-game-developer`, `css-architect` | Troca de tema muda a interface (variáveis CSS) e o canvas (`tema.js`) |

**Nesta sessão, fazer só a Fase 1 e a Fase 2.** As outras ficam planejadas.
Depois de cada fase, parar, mostrar ao Guilherme o que mudou e esperar o "ok"
dele antes de seguir.

---

## 8. Salvar a sessão no Segundo Cérebro

Cofre: `C:\Users\Guilherme Tyszkouski\OneDrive\Documents\SEGUNDO CEREBRO`

1. **Ler os índices do cofre antes** e seguir as convenções que já estão lá
   (pastas, nomes de nota, links `[[...]]`, frontmatter).
2. **Criar ou atualizar a nota do projeto** (ex.: `Jogo da Forca`):
   - link do repositório e branch `feature/piranha-hangman-v2`;
   - resumo das Noites 1 a 3 e das fases feitas nesta sessão;
   - decisões: piranha original, Canvas, manter Cloudflare, Elo no servidor;
   - pendências.
3. **Criar ou atualizar a nota de padrão global**, ex.:
   `Padrão de CSS — BEM + @import`. Ela descreve a seção 2 inteira e diz que
   vale para **todos** os projetos do Guilherme, com o repositório
   `ERP-controle-de-estoque` como referência.
4. **Nota da sessão com data (2026-11-16 ou a data do dia):**
   - o que foi pedido;
   - quais agentes foram usados (`canvas-game-developer`,
     `frontend-reviewer`, `css-architect`);
   - o que foi entregue;
   - o que aprendeu (ex.: laço de jogo com `dt`, máquina de estados, fila de
     animações).
5. Atualizar os índices do cofre para apontar para as notas novas.

---

## 9. Registro de decisões

- 2026-11-16: o personagem que come o boneco é uma **piranha voadora
  original**, e não um personagem conhecido (direito autoral e criatividade no
  portfólio).
- 2026-11-16: **padrão de CSS separado** (BEM + `blocks/` + `pages/index.css`
  com `@import` + `vendor/fonts.css` com `@font-face`) passa a ser
  **obrigatório em todos os projetos**.
- 2026-11-16: trabalho do v2 numa branch própria
  (`feature/piranha-hangman-v2`), com merge só depois da aprovação do Guilherme.
- 2026-11-16: o backend continua no **Cloudflare** (Pages + Functions + D1),
  e não em Firebase/Supabase.
- 2026-11-16: **exceção ao "JS só liga classes"**: para valores contínuos
  (parallax e inclinação que seguem o mouse em `public/script.js`), o JS pode
  escrever só variáveis CSS (`style.setProperty("--tilt-x", x)`); o
  `transform` fica no bloco CSS. Escolhido pelo Guilherme em vez de remover o
  efeito ou trocar por estados fixos. Registrado no `AGENTS.md`.

---

## 10. Checklist final da sessão

- [ ] Branch `feature/piranha-hangman-v2` criada e enviada; nada commitado na
  `main`
- [ ] `canvas-game-developer.agent.md` movido para `.github/agents/`
- [ ] `css-architect` criado e listado no `AGENTS.md`
- [ ] Seção "Padrão de código (obrigatório)" no `AGENTS.md`
- [ ] Fase 1 concluída: zero CSS dentro do HTML ou do JS
- [ ] Fase 2 concluída e revisada pelo `frontend-reviewer`
- [ ] `docs/forca-canvas.md` com as entradas datadas
- [ ] Segundo Cérebro atualizado (projeto, padrão global, nota da sessão,
  índices)
- [ ] Pull Request aberto para a `main`, aguardando o Guilherme
