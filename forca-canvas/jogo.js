// 1. Pega a lousa, o pincel e os elementos da pagina
const tela = document.getElementById("tela");
const ctx = tela.getContext("2d");
const areaStatus = document.getElementById("status");       // texto para leitor de tela
const teclado = document.getElementById("teclado");         // botoes de letra
const botaoNova = document.getElementById("novaPartida");   // botao "Nova partida"

// 2. Lista de palavras do laboratorio (so para treino).
// No jogo de verdade a palavra fica no servidor (regra de ouro do AGENTS.md).
const PALAVRAS = [
  { palavra: "BANANA",     categoria: "FRUTA" },
  { palavra: "ABACAXI",    categoria: "FRUTA" },
  { palavra: "MORANGO",    categoria: "FRUTA" },
  { palavra: "CACHORRO",   categoria: "ANIMAL" },
  { palavra: "GIRAFA",     categoria: "ANIMAL" },
  { palavra: "TARTARUGA",  categoria: "ANIMAL" },
  { palavra: "BRASIL",     categoria: "PAIS" },
  { palavra: "PORTUGAL",   categoria: "PAIS" },
  { palavra: "JAPAO",      categoria: "PAIS" },
  { palavra: "MECANICO",   categoria: "PROFISSAO" },
  { palavra: "PROFESSOR",  categoria: "PROFISSAO" },
  { palavra: "CADEIRA",    categoria: "OBJETO" },
  { palavra: "TECLADO",    categoria: "OBJETO" },
  { palavra: "CAMINHAO",   categoria: "VEICULO" },
];

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 3. Cores em um lugar so (fundo escuro, texto claro)
const COR = {
  fundo: "#1e1e2e",
  forca: "#c9a46b",
  boneco: "#f5f5f5",
  texto: "#e6e6e6",
  acerto: "#7ee787",
  erro: "#ff7b72",
  fraco: "#b4b9bf",
  piranha: "#8e44d6",       // corpo roxo
  piranhaEscura: "#5e2a94", // cauda, barbatana e mandibula
  boca: "#24082f",          // dentro da boca
};

// 4. As 6 partes do boneco, na ordem em que a piranha come.
// Linha = ponta (x1, y1) ate ponta (x2, y2). Circulo = centro (x, y) e raio.
const PARTES = [
  { nome: "a cabeca",         tipo: "circulo", x: 190, y: 97, raio: 22 },
  { nome: "o corpo",          tipo: "linha", x1: 190, y1: 119, x2: 190, y2: 190 },
  { nome: "o braco esquerdo", tipo: "linha", x1: 190, y1: 135, x2: 160, y2: 165 },
  { nome: "o braco direito",  tipo: "linha", x1: 190, y1: 135, x2: 220, y2: 165 },
  { nome: "a perna esquerda", tipo: "linha", x1: 190, y1: 190, x2: 165, y2: 240 },
  { nome: "a perna direita",  tipo: "linha", x1: 190, y1: 190, x2: 215, y2: 240 },
];

// 5. O estado do jogo: so numeros e textos, nada de desenho aqui
const estado = {
  palavra: "",
  categoria: "",
  certas: [],   // letras chutadas que estao na palavra
  erradas: [],  // letras chutadas que NAO estao na palavra
  maxErros: 6,
  fase: "jogando", // "jogando" | "ganhou" | "perdeu"
};

// 6. O estado da animacao (separado da regra do jogo)
const boneco = {
  escala: [1, 1, 1, 1, 1, 1], // tamanho de cada parte: 1 = inteira, 0 = comida
  tempoPulo: 0,               // relogio do pulinho de alegria
};

const piranha = {
  fase: "parada",  // "parada" | "entrando" | "mordendo" | "saindo"
  x: -100, y: 0,   // posicao do centro do corpo
  direcao: -1,     // -1 = olhando para a esquerda, 1 = para a direita
  alvo: 0,         // numero da parte que ela vai comer
  fila: [],        // mordidas esperando a vez (erros rapidos)
  tempo: 0,        // relogio do balanco no ar
  tempoMordida: 0, // quanto tempo ja passou mordendo
  boca: 0,         // 0 = fechada, 1 = toda aberta
  saidaY: 0,       // altura para onde ela sobe ao sair (guardada uma vez)
};

const VELOCIDADE = 600;       // pixels por segundo
const DURACAO_MORDIDA = 0.6;  // segundos mastigando
const BOCA_FRENTE = 34;       // distancia do centro da piranha ate a boca

// A pessoa pediu "menos movimento" no sistema? Entao a piranha nao voa,
// nao balanca, nao solta migalhas e o boneco nao pula.
const MOVIMENTO_REDUZIDO = matchMedia("(prefers-reduced-motion: reduce)").matches;

let migalhas = []; // pedacinhos que voam na mordida

// ---------------------------------------------------------- logica

// Quantos erros: e so o tamanho da lista de erradas (sem guardar duas vezes)
function erros() {
  return estado.erradas.length;
}

// A piranha ainda tem trabalho? (voando ou com mordida na fila)
function animando() {
  return piranha.fase !== "parada" || piranha.fila.length > 0;
}

// Sorteia uma palavra (diferente da anterior) e zera tudo
function novaPartida() {
  // O foco estava no botao "Nova partida"? Ele vai sumir, entao o foco
  // passa para a primeira letra (senao cai no nada).
  const focoNoBotao = document.activeElement === botaoNova;
  let sorteio;
  do {
    sorteio = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
  } while (sorteio.palavra === estado.palavra); // repetiu? sorteia de novo

  estado.palavra = sorteio.palavra;
  estado.categoria = sorteio.categoria;
  estado.certas = [];
  estado.erradas = [];
  estado.fase = "jogando";

  // boneco inteiro de novo e piranha fora da tela
  boneco.escala = [1, 1, 1, 1, 1, 1];
  boneco.tempoPulo = 0;
  piranha.fase = "parada";
  piranha.fila = [];
  piranha.x = -100;
  migalhas = [];

  atualizarTeclado();
  if (focoNoBotao) teclado.firstElementChild.focus();
  avisar("Nova partida. Categoria " + estado.categoria + ", " +
         estado.palavra.length + " letras. Palavra: " + textoPalavra() + ".");
}

// So comeca outra partida se a atual acabou e a piranha terminou
function reiniciar() {
  if (estado.fase !== "jogando" && !animando()) novaPartida();
}

// O jogador chutou uma letra (vem do teclado fisico ou dos botoes)
function chutar(letra) {
  if (estado.fase !== "jogando") return; // partida acabou, ignora

  // Ja chutou essa letra? Avisa e nao conta de novo
  if (estado.certas.includes(letra) || estado.erradas.includes(letra)) {
    avisar("Voce ja tentou a letra " + letra + ".");
    return;
  }

  if (estado.palavra.includes(letra)) {
    estado.certas.push(letra);
  } else {
    estado.erradas.push(letra);
    piranha.fila.push(erros() - 1); // a piranha vai comer a proxima parte
  }

  atualizarTeclado();
  if (!verificarFim()) avisarJogada(letra); // se acabou, o aviso de fim ja foi dado
}

// Quantas vezes a letra aparece na palavra
function contar(letra) {
  let total = 0;
  for (const l of estado.palavra) {
    if (l === letra) total++;
  }
  return total;
}

// A palavra como texto para o leitor de tela: "_ A _ A _ A"
function textoPalavra() {
  const partes = [];
  for (const letra of estado.palavra) {
    partes.push(estado.certas.includes(letra) ? letra : "_");
  }
  return partes.join(" ");
}

// Monta o aviso de uma jogada: acerto/erro, palavra e letras erradas
function avisarJogada(letra) {
  let texto;
  const vezes = contar(letra);
  if (vezes > 0) {
    texto = "Acertou: a letra " + letra + " aparece " + vezes + (vezes === 1 ? " vez." : " vezes.");
  } else {
    texto = "Errou: nao tem " + letra + ". A piranha vai comer " + PARTES[erros() - 1].nome +
            ". Erros: " + erros() + " de " + estado.maxErros + ".";
  }
  texto += " Palavra: " + textoPalavra() + ".";
  if (estado.erradas.length > 0) {
    texto += " Letras erradas: " + estado.erradas.join(", ") + ".";
  }
  avisar(texto);
}

// Ganhou se todas as letras da palavra foram acertadas
function palavraCompleta() {
  for (const letra of estado.palavra) {
    if (!estado.certas.includes(letra)) return false;
  }
  return true;
}

// Decide se a partida acabou. Devolve true se acabou.
function verificarFim() {
  if (palavraCompleta()) {
    estado.fase = "ganhou";
    atualizarTeclado();
    if (animando()) {
      // a piranha ainda esta voando: o Enter so vale depois (fimDasMordidas)
      avisar("Voce ganhou! A palavra era " + estado.palavra + ".");
    } else {
      fimDasMordidas(); // nada voando: ja mostra o fim
    }
    return true;
  }
  if (erros() >= estado.maxErros) {
    // A regra ja decidiu: perdeu. O aviso de fim espera a ultima mordida.
    estado.fase = "perdeu";
    atualizarTeclado();
    avisar("Errou: nao tem " + estado.erradas[erros() - 1] +
           ". A piranha vai comer " + PARTES[erros() - 1].nome + ", a ultima parte.");
    return true;
  }
  return false; // ainda jogando
}

// Chamado quando a piranha termina a ultima mordida da fila
// (ou na hora, se ganhou sem nada voando)
function fimDasMordidas() {
  atualizarTeclado(); // mostra o botao Nova partida, se a partida acabou
  if (estado.fase === "jogando") return; // so acabou uma mordida, segue o jogo

  if (estado.fase === "perdeu") {
    avisar("Voce perdeu. A piranha comeu o boneco inteiro. A palavra era " +
           estado.palavra + ". Aperte Enter ou o botao Nova partida.");
  } else {
    avisar("Voce ganhou! A palavra era " + estado.palavra +
           ". Aperte Enter ou o botao Nova partida.");
  }
  // as letras ficaram travadas: o foco vai para o botao, e nao se perde
  botaoNova.focus();
}

// Escreve o status na regiao aria-live (o leitor de tela anuncia).
// Apaga antes e escreve um pouco depois: assim uma frase igual a anterior
// tambem e lida de novo.
function avisar(texto) {
  areaStatus.textContent = "";
  setTimeout(function () {
    areaStatus.textContent = texto;
  }, 50);
}

// ---------------------------------------------------------- teclado na tela

// Cria um botao para cada letra, uma vez so
function criarTeclado() {
  for (const letra of ALFABETO) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = letra;
    botao.dataset.letra = letra;           // guarda a letra no botao
    botao.addEventListener("click", function () {
      chutar(letra);                       // mesma funcao do teclado fisico
    });
    teclado.appendChild(botao);
  }
}

// Pinta os botoes conforme o estado: usada fica travada, verde ou vermelha
function atualizarTeclado() {
  for (const botao of teclado.children) {
    const letra = botao.dataset.letra;
    const certa = estado.certas.includes(letra);
    const errada = estado.erradas.includes(letra);

    botao.classList.toggle("certa", certa);
    botao.classList.toggle("errada", errada);
    botao.disabled = certa || errada || estado.fase !== "jogando";

    // O leitor de tela tambem fica sabendo se a letra ja foi usada
    let nome = "Letra " + letra;
    if (certa) nome += ", acertou";
    if (errada) nome += ", errou";
    botao.setAttribute("aria-label", nome);
  }
  // So aparece no fim, depois que a piranha terminou
  botaoNova.hidden = estado.fase === "jogando" || animando();
}

botaoNova.addEventListener("click", reiniciar);

// ---------------------------------------------------------- teclado fisico

document.addEventListener("keydown", function (evento) {
  if (evento.repeat) return; // tecla segurada nao vale
  // Atalhos (Ctrl+F, Alt+Z, Cmd+C...) sao do navegador, nao do jogo
  if (evento.ctrlKey || evento.altKey || evento.metaKey) return;

  // Enter comeca outra partida, mas so quando a atual acabou
  // Se o foco esta num botao, o proprio navegador transforma o Enter em
  // clique nele; chamar reiniciar() aqui tambem faria o clique cair na letra A.
  if (evento.key === "Enter") {
    if (evento.target.tagName !== "BUTTON") reiniciar();
    return;
  }

  // So aceita uma letra de A a Z
  const letra = evento.key.toUpperCase();
  if (/^[A-Z]$/.test(letra)) {
    chutar(letra);
  }
});

// ---------------------------------------------------------- atualizar (animacao)

// O meio de uma parte: e ali que a piranha morde
function centro(parte) {
  if (parte.tipo === "circulo") return { x: parte.x, y: parte.y };
  return { x: (parte.x1 + parte.x2) / 2, y: (parte.y1 + parte.y2) / 2 };
}

// Onde o CORPO da piranha precisa parar para a BOCA ficar na parte
function pontoDeMordida() {
  const c = centro(PARTES[piranha.alvo]);
  return { x: c.x - piranha.direcao * BOCA_FRENTE, y: c.y };
}

// Comeca um voo. Ela vem sempre pela esquerda (o lado da forca),
// para nao passar por cima do texto da direita.
function comecarVoo(numeroDaParte) {
  piranha.direcao = 1;                              // olha para a direita
  piranha.x = -80;                                  // nasce fora da tela
  piranha.y = centro(PARTES[numeroDaParte]).y - 60; // um pouco acima: entra em diagonal
  irPara(numeroDaParte);
}

// Escolhe a proxima parte. Com movimento reduzido, ela aparece ja mordendo.
function irPara(numeroDaParte) {
  piranha.alvo = numeroDaParte;
  if (MOVIMENTO_REDUZIDO) {
    const p = pontoDeMordida();
    piranha.x = p.x;
    piranha.y = p.y;
    comecarMordida();
  } else {
    piranha.fase = "entrando";
  }
}

// Chegou na parte: comeca a mastigar
function comecarMordida() {
  piranha.fase = "mordendo";
  piranha.tempoMordida = 0;
  const c = centro(PARTES[piranha.alvo]);
  soltarMigalhas(c.x, c.y);
}

// Anda um pouco em direcao ao ponto (px, py). Devolve true se chegou.
function andarAte(px, py, dt) {
  const dx = px - piranha.x;
  const dy = py - piranha.y;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  const passo = VELOCIDADE * dt; // quanto anda neste quadro

  if (distancia <= passo) {
    piranha.x = px;
    piranha.y = py;
    return true;
  }
  piranha.x += (dx / distancia) * passo;
  piranha.y += (dy / distancia) * passo;
  return false;
}

// Joga alguns pedacinhos para os lados
function soltarMigalhas(x, y) {
  if (MOVIMENTO_REDUZIDO) return; // sem pedacinhos voando
  for (let i = 0; i < 8; i++) {
    migalhas.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 240, // velocidade para os lados (px/s)
      vy: -Math.random() * 200,        // para cima (px/s)
      vida: 0.6,                       // segundos ate sumir
    });
  }
}

// A maquina de estados da piranha
function atualizarPiranha(dt) {
  piranha.tempo += dt;

  if (piranha.fase === "parada") {
    if (piranha.fila.length > 0) comecarVoo(piranha.fila.shift()); // tem mordida na fila
    return;
  }

  if (piranha.fase === "entrando") {
    piranha.boca = 0.3; // boca entreaberta no voo
    const p = pontoDeMordida();
    if (andarAte(p.x, p.y, dt)) comecarMordida();
    return;
  }

  if (piranha.fase === "mordendo") {
    piranha.tempoMordida += dt;
    // abre e fecha a boca 5 vezes por segundo (seno vai de -1 a 1)
    piranha.boca = (Math.sin(piranha.tempoMordida * Math.PI * 2 * 5) + 1) / 2;
    // a parte encolhe de 1 ate 0 durante a mordida
    const resto = 1 - piranha.tempoMordida / DURACAO_MORDIDA;
    boneco.escala[piranha.alvo] = Math.max(0, resto);

    if (piranha.tempoMordida >= DURACAO_MORDIDA) {
      boneco.escala[piranha.alvo] = 0; // comida de vez
      if (piranha.fila.length > 0) {
        irPara(piranha.fila.shift()); // tem mais na fila: vai direto, sem sair
      } else if (MOVIMENTO_REDUZIDO) {
        terminarVoo();                // some na hora, sem voar para fora
      } else {
        piranha.fase = "saindo";
        piranha.saidaY = -80;         // sobe ate sair por cima
      }
    }
    return;
  }

  if (piranha.fase === "saindo") {
    piranha.boca = 0;
    // sobe reto (x nao muda) ate sair por cima da tela
    if (andarAte(piranha.x, piranha.saidaY, dt)) terminarVoo();
  }
}

// A piranha saiu de cena. Se nao tem mais nada na fila, avisa o fim.
function terminarVoo() {
  piranha.fase = "parada";
  if (piranha.fila.length === 0) fimDasMordidas();
}

// Migalhas caem com gravidade e somem
function atualizarMigalhas(dt) {
  for (const m of migalhas) {
    m.vy += 500 * dt; // gravidade (px/s a cada segundo)
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vida -= dt;
  }
  migalhas = migalhas.filter(function (m) { return m.vida > 0; });
}

// Muda tudo que se mexe com o tempo. dt = segundos desde o ultimo quadro.
function atualizar(dt) {
  atualizarPiranha(dt);
  atualizarMigalhas(dt);
  // relogio do pulinho: so anda quando a piranha ja terminou
  if (estado.fase === "ganhou" && !animando()) boneco.tempoPulo += dt;
}

// ---------------------------------------------------------- desenho

// Ajuda: desenha uma linha reta de (x1, y1) ate (x2, y2)
function linha(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Ajuda: pinta um triangulo com 3 pontos
function triangulo(ax, ay, bx, by, cx, cy) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();
}

// A forca: base, poste, viga e corda
function desenharForca() {
  ctx.strokeStyle = COR.forca;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  linha(40, 280, 200, 280);  // base
  linha(80, 280, 80, 40);    // poste
  linha(80, 40, 190, 40);    // viga
  ctx.lineWidth = 3;
  linha(190, 40, 190, 75);   // corda
}

// O boneco: desenha so as partes que ainda nao foram comidas
function desenharBoneco() {
  ctx.save();

  // Ganhou? O boneco da pulinhos (o seno sobe e desce; abs deixa so para cima)
  if (estado.fase === "ganhou" && !MOVIMENTO_REDUZIDO) {
    ctx.translate(0, -Math.abs(Math.sin(boneco.tempoPulo * 6)) * 12);
  }

  ctx.strokeStyle = COR.boneco;
  ctx.lineWidth = 4;

  for (let i = 0; i < PARTES.length; i++) {
    const s = boneco.escala[i];
    if (s <= 0) continue; // ja foi comida

    const parte = PARTES[i];
    const c = centro(parte);

    ctx.save();
    ctx.globalAlpha = s;          // vai ficando transparente
    ctx.translate(c.x, c.y);      // leva o "zero" para o meio da parte
    ctx.scale(s, s);              // encolhe em volta do meio
    ctx.translate(-c.x, -c.y);    // volta o "zero" para o canto

    if (parte.tipo === "circulo") {
      ctx.beginPath();
      ctx.arc(parte.x, parte.y, parte.raio, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      linha(parte.x1, parte.y1, parte.x2, parte.y2);
    }
    ctx.restore();
  }

  ctx.restore();
}

// A piranha voadora: desenhada olhando para a direita, e virada com scale
function desenharPiranha() {
  if (piranha.fase === "parada") return; // fora de cena

  // sobe e desce no ar (parada, se a pessoa pediu menos movimento)
  const balanco = MOVIMENTO_REDUZIDO ? 0 : Math.sin(piranha.tempo * 8) * 4;

  ctx.save();
  ctx.translate(piranha.x, piranha.y + balanco);
  ctx.scale(piranha.direcao, 1); // direcao -1 espelha o desenho

  // cauda em forquilha (dois triangulos)
  ctx.fillStyle = COR.piranhaEscura;
  triangulo(-24, 0, -46, -18, -38, 0);
  triangulo(-24, 0, -46, 18, -38, 0);

  // barbatana de cima
  triangulo(-8, -16, 6, -30, 10, -16);

  // corpo oval
  ctx.fillStyle = COR.piranha;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // dentro da boca (aparece quando a mandibula abre)
  ctx.fillStyle = COR.boca;
  triangulo(6, 4, 32, 0, 32, 4 + piranha.boca * 18);

  // dentes de cima, pequenos
  ctx.fillStyle = "#ffffff";
  triangulo(20, 2, 23, 8, 26, 2);
  triangulo(26, 1, 29, 7, 32, 1);

  // mandibula de baixo: gira para abrir. Sai para fora do corpo (queixo pra frente)
  ctx.save();
  ctx.translate(6, 6);                // ponto de giro da mandibula
  ctx.rotate(piranha.boca * 0.6);     // aberta = mais girada
  ctx.fillStyle = COR.piranhaEscura;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(32, -4);
  ctx.lineTo(30, 6);
  ctx.lineTo(0, 12);
  ctx.closePath();
  ctx.fill();
  // dentes de baixo, apontando para cima
  ctx.fillStyle = "#ffffff";
  triangulo(12, -1, 15, -9, 18, -2);
  triangulo(19, -2, 22, -10, 25, -3);
  triangulo(26, -3, 29, -11, 32, -4);
  ctx.restore();

  // olho: branco com pupila
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(10, -8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(12, -8, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Pedacinhos brancos da mordida
function desenharMigalhas() {
  ctx.fillStyle = COR.boneco;
  for (const m of migalhas) {
    ctx.globalAlpha = Math.max(0, m.vida / 0.6); // somem aos poucos
    ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

// A palavra: tracinho para cada letra, e a letra em cima se ja acertou
function desenharPalavra() {
  // Espaco de cada letra: no maximo 40, menor se a palavra for comprida
  const largura = Math.min(40, (tela.width - 40) / estado.palavra.length);
  const total = estado.palavra.length * largura;
  const inicioX = (tela.width - total) / 2; // centraliza
  const y = 360;
  const meioTraco = largura * 0.36;         // metade do tracinho

  ctx.textAlign = "center";
  ctx.font = "bold " + Math.round(largura * 0.8) + "px monospace"; // fonte acompanha o espaco

  for (let i = 0; i < estado.palavra.length; i++) {
    const letra = estado.palavra[i];
    const x = inicioX + i * largura + largura / 2; // meio do espaco

    // tracinho
    ctx.strokeStyle = COR.texto;
    ctx.lineWidth = 3;
    linha(x - meioTraco, y + 6, x + meioTraco, y + 6);

    // letra: mostra se acertou, ou (em vermelho) se perdeu
    if (estado.certas.includes(letra)) {
      ctx.fillStyle = COR.texto;
      ctx.fillText(letra, x, y);
    } else if (estado.fase === "perdeu" && !animando()) {
      ctx.fillStyle = COR.erro;
      ctx.fillText(letra, x, y);
    }
  }
}

// Lado direito: categoria, erros e letras erradas.
// Fontes grandes porque no celular o canvas encolhe para quase metade.
function desenharInfo() {
  ctx.textAlign = "left";

  ctx.fillStyle = COR.fraco;
  ctx.font = "24px sans-serif";
  ctx.fillText("Categoria", 290, 70);
  ctx.fillStyle = COR.texto;
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(estado.categoria, 290, 108);

  ctx.fillStyle = COR.fraco;
  ctx.font = "24px sans-serif";
  ctx.fillText("Erros: " + erros() + " de " + estado.maxErros, 290, 160);

  ctx.fillText("Letras erradas", 290, 205);
  ctx.fillStyle = COR.erro;
  ctx.font = "bold 28px monospace";
  ctx.fillText(estado.erradas.join(" "), 290, 242);
}

// A caixa de fim so aparece depois que a piranha terminou de comer
function mostrandoMensagem() {
  return estado.fase !== "jogando" && !animando();
}

// Caixa por cima de tudo quando a partida acaba
function desenharMensagem() {
  if (!mostrandoMensagem()) return;

  // fundo escuro quase opaco
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(70, 95, 460, 180);

  ctx.textAlign = "center";
  if (estado.fase === "ganhou") {
    ctx.fillStyle = COR.acerto;
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("Voce ganhou!", 300, 160);
  } else {
    ctx.fillStyle = COR.erro;
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("Voce perdeu", 300, 150);
    ctx.fillStyle = COR.texto;
    ctx.font = "26px sans-serif";
    ctx.fillText("A palavra era " + estado.palavra, 300, 197);
  }

  ctx.fillStyle = COR.fraco;
  ctx.font = "24px sans-serif";
  ctx.fillText("Enter ou o botao para jogar de novo", 300, 248);
}

// Desenhar: apaga tudo e pinta de novo, na ordem (o ultimo fica por cima)
function desenhar() {
  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, tela.width, tela.height); // "apaga" a lousa

  desenharForca();
  desenharBoneco();
  desenharPalavra();
  desenharInfo();
  desenharMigalhas();
  desenharPiranha(); // por cima do boneco (ela voa so do lado esquerdo)
  desenharMensagem();
}

// ---------------------------------------------------------- laco do jogo

// atualizar -> desenhar -> pedir o proximo quadro
let ultimoTempo = performance.now();

function laco(agora) {
  let dt = (agora - ultimoTempo) / 1000; // segundos desde o ultimo quadro
  // nem negativo (1o quadro pode vir "antes" do relogio inicial),
  // nem grande demais (evita "teleporte" ao voltar de outra aba)
  dt = Math.max(0, Math.min(dt, 0.1));
  ultimoTempo = agora;

  atualizar(dt);
  desenhar();
  requestAnimationFrame(laco);
}

criarTeclado();
novaPartida();
requestAnimationFrame(laco);
