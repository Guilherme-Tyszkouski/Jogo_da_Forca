// boneco.js: as partes do boneco, o estado da animacao dele e o desenho.

// As 6 partes do boneco, na ordem em que a piranha come.
// Linha = ponta (x1, y1) ate ponta (x2, y2). Circulo = centro (x, y) e raio.
const PARTES = [
  { nome: "a cabeca",         tipo: "circulo", x: 190, y: 97, raio: 22 },
  { nome: "o corpo",          tipo: "linha", x1: 190, y1: 119, x2: 190, y2: 190 },
  { nome: "o braco esquerdo", tipo: "linha", x1: 190, y1: 135, x2: 160, y2: 165 },
  { nome: "o braco direito",  tipo: "linha", x1: 190, y1: 135, x2: 220, y2: 165 },
  { nome: "a perna esquerda", tipo: "linha", x1: 190, y1: 190, x2: 165, y2: 240 },
  { nome: "a perna direita",  tipo: "linha", x1: 190, y1: 190, x2: 215, y2: 240 },
];

// O estado da animacao (separado da regra do jogo)
const boneco = {
  escala: [1, 1, 1, 1, 1, 1], // tamanho de cada parte: 1 = inteira, 0 = comida
  tempoPulo: 0,               // relogio do pulinho de alegria
};

// O meio de uma parte: e ali que a piranha morde
function centro(parte) {
  if (parte.tipo === "circulo") return { x: parte.x, y: parte.y };
  return { x: (parte.x1 + parte.x2) / 2, y: (parte.y1 + parte.y2) / 2 };
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
