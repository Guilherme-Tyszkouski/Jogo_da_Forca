// boneco.js: as partes do boneco, a maquina de estados dele e as posicoes.
// O desenho fica no boneco-desenho.js.

// As 6 partes, na ordem em que a piranha come (de baixo para cima).
// As medidas sao "do boneco": o ponto (0, 0) e o alto da cabeca.
// Linhas tem duas poses: normal e panico (braco para cima, joelho dobrado).
// As duas poses tem o mesmo numero de pontos, para dar para misturar.
const PARTES = [
  { aviso: "Perna esquerda devorada", tipo: "linha", grupo: "perna",
    normal: [[0, 95], [-9, 115], [-18, 135]], panico: [[0, 95], [-20, 108], [-12, 124]] },
  { aviso: "Perna direita devorada", tipo: "linha", grupo: "perna",
    normal: [[0, 95], [9, 115], [18, 135]], panico: [[0, 95], [20, 108], [12, 124]] },
  { aviso: "Braco esquerdo devorado", tipo: "linha", grupo: "braco",
    normal: [[0, 50], [-25, 78]], panico: [[0, 50], [-26, 22]] },
  { aviso: "Braco direito devorado", tipo: "linha", grupo: "braco",
    normal: [[0, 50], [25, 78]], panico: [[0, 50], [26, 22]] },
  { aviso: "Tronco devorado", tipo: "linha", grupo: "tronco",
    normal: [[0, 38], [0, 95]], panico: [[0, 38], [0, 95]] },
  { aviso: "Cabeca devorada", tipo: "circulo", x: 0, y: 20, raio: 18 },
];

const PES = 135;          // dos pes ate o alto da cabeca, na pose normal
const GRAVIDADE = 900;    // queda na vitoria (px/s a cada segundo)
const POUSO_X = 115;      // o mais longe que ele pode cair: ainda em cima da margem
const GIRO_VOLTA = 0.5;   // radianos por segundo: a inclinacao some em ate ~0,25 s

// O estado da animacao (separado da regra do jogo)
const boneco = {
  fase: "balancando", // "balancando" | "panico" | "aliviado" | "devorado"
  escala: [1, 1, 1, 1, 1, 1], // tamanho de cada parte: 1 = inteira, 0 = comida
  tempo: 0,      // relogio do balanco e dos pulinhos
  medo: 0,       // pernas e rosto: 0 = normal, 1 = panico (muda aos poucos)
  bracos: 0,     // bracos: 0 = para baixo, 1 = para cima
  calma: 0,      // segundos sem ataque; com 1 s volta a balancar
  tempoSuor: 0,  // relogio das gotas de suor
  // queda na vitoria: posicao do alto da cabeca e velocidade
  x: 0, y: 0, vx: 0, vy: 0, noChao: false,
  giro: 0,       // inclinacao na queda (comeca no angulo do balanco e vai a 0)
};

// Boneco inteiro, pendurado, calmo
function prepararBoneco() {
  boneco.fase = "balancando";
  boneco.escala = [1, 1, 1, 1, 1, 1];
  boneco.tempo = 0;
  boneco.medo = 0;
  boneco.bracos = 0;
  boneco.noChao = false;
  boneco.giro = 0;
}

// ---------------------------------------------------------- atualizar (animacao)

// Leva "atual" ate "alvo" sem passar dele, andando "passo"
function aproximar(atual, alvo, passo) {
  if (atual < alvo) return Math.min(alvo, atual + passo);
  return Math.max(alvo, atual - passo);
}

// A maquina de estados do boneco
function atualizarBoneco(dt) {
  boneco.tempo += dt;

  if (boneco.fase === "devorado") return; // acabou

  if (boneco.fase === "aliviado") {
    cair(dt);
    boneco.giro = aproximar(boneco.giro, 0, GIRO_VOLTA * dt);          // endireita aos poucos
    boneco.bracos = aproximar(boneco.bracos, 1, 6 * dt);            // bracos para cima
    boneco.medo = aproximar(boneco.medo, boneco.noChao ? 0 : 1, 6 * dt); // pernas esticam no chao
    return;
  }

  // A partida acabou e a piranha nao tem mais nada para morder?
  if (estado.fase === "ganhou" && !piranhaComendo()) {
    comecarQueda();
    return;
  }
  if (estado.fase === "perdeu" && !piranhaComendo()) {
    boneco.fase = "devorado";
    return;
  }

  // Piranha atacando = panico. Sem ataque por 1 s = volta a balancar.
  if (piranhaComendo()) {
    boneco.fase = "panico";
    boneco.calma = 0;
  } else if (boneco.fase === "panico") {
    boneco.calma += dt;
    if (boneco.calma >= 1) boneco.fase = "balancando";
  }

  const alvo = boneco.fase === "panico" ? 1 : 0;
  boneco.medo = aproximar(boneco.medo, alvo, 5 * dt);
  boneco.bracos = aproximar(boneco.bracos, alvo, 5 * dt);

  // Gotas de suor saindo da cabeca (uma a cada 0,25 s), se a cabeca existe
  if (boneco.fase === "panico" && boneco.escala[5] > 0) {
    boneco.tempoSuor += dt;
    if (boneco.tempoSuor >= 0.25) {
      boneco.tempoSuor = 0;
      const cabeca = noMundo(0, 20);
      const lado = Math.random() < 0.5 ? -1 : 1;
      soltarParticulas(cabeca.x + lado * 18, cabeca.y - 8, 1, COR.aguaClara, 120);
    }
  }
}

// Ganhou: a corda solta e ele pula para a margem (nunca para a agua)
function comecarQueda() {
  const inicio = noMundo(0, 0); // onde o alto da cabeca esta agora
  boneco.giro = anguloBalanco(); // continua inclinado como estava (antes de mudar a fase)
  boneco.fase = "aliviado";
  boneco.x = inicio.x;
  boneco.y = inicio.y;
  boneco.vx = -140; // para a esquerda, em direcao a margem
  boneco.vy = -250; // um pulinho para cima antes de cair
  boneco.noChao = false;
  if (MOVIMENTO_REDUZIDO) pousar(); // sem queda: ja aparece na margem
}

// Queda com gravidade, ate os pes tocarem o chao da margem
function cair(dt) {
  if (boneco.noChao) return;
  boneco.vy += GRAVIDADE * dt;
  boneco.x += boneco.vx * dt;
  boneco.y += boneco.vy * dt;
  if (boneco.vy > 0 && boneco.y + PES >= MEDIDA.chao) pousar();
}

// Fica de pe na margem
function pousar() {
  boneco.x = Math.min(boneco.x, POUSO_X); // garante que fica em cima da terra, nunca na agua
  boneco.y = MEDIDA.chao - PES;
  boneco.noChao = true;
  boneco.tempo = 0; // os pulinhos de festa comecam agora
}

// O boneco ainda esta caindo?
function bonecoCaindo() {
  return boneco.fase === "aliviado" && !boneco.noChao;
}

// ---------------------------------------------------------- posicoes

// Angulo do balanco na corda (em panico balanca mais)
function anguloBalanco() {
  if (MOVIMENTO_REDUZIDO) return 0;
  // 0,05 calmo ate 0,12 em panico, acompanhando o medo (sem pulo)
  const forca = 0.05 + 0.07 * boneco.medo;
  return Math.sin(boneco.tempo * 2) * forca;
}

// Converte um ponto "do boneco" (pendurado) para um ponto do canvas.
// E a mesma conta que o ctx.rotate faz no desenho.
function noMundo(px, py) {
  const a = anguloBalanco();
  const y = py + MEDIDA.corda;
  return {
    x: MEDIDA.pivoX + px * Math.cos(a) - y * Math.sin(a),
    y: MEDIDA.pivoY + px * Math.sin(a) + y * Math.cos(a),
  };
}

// Os pontos de uma linha agora: mistura a pose normal com a de panico
function pontosDaParte(parte) {
  const t = parte.grupo === "braco" ? boneco.bracos : boneco.medo;
  return parte.normal.map(function (p, i) {
    const q = parte.panico[i];
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  });
}

// O meio de uma parte, "do boneco"
function meioDaParte(parte) {
  if (parte.tipo === "circulo") return { x: parte.x, y: parte.y };
  const pontos = pontosDaParte(parte);
  const ultimo = pontos[pontos.length - 1];
  return { x: (pontos[0][0] + ultimo[0]) / 2, y: (pontos[0][1] + ultimo[1]) / 2 };
}

// O meio de uma parte no canvas: e ali que a piranha morde
function centroDaParte(numero) {
  const m = meioDaParte(PARTES[numero]);
  return noMundo(m.x, m.y);
}
