// boneco-desenho.js: o desenho do boneco (partes, ossos e rosto).
// So pinta: o estado e as posicoes ficam no boneco.js.

// Uma linha que passa por varios pontos
function linhaPorPontos(pontos) {
  ctx.beginPath();
  ctx.moveTo(pontos[0][0], pontos[0][1]);
  for (let i = 1; i < pontos.length; i++) ctx.lineTo(pontos[i][0], pontos[i][1]);
  ctx.stroke();
}

// O que sobra de uma parte comida: osso (linha) ou contorno tracejado (cabeca)
function desenharOsso(parte) {
  ctx.strokeStyle = COR.osso;
  ctx.fillStyle = COR.osso;
  ctx.lineWidth = 3;
  if (parte.tipo === "circulo") {
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(parte.x, parte.y, parte.raio, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  const pontos = pontosDaParte(parte);
  linhaPorPontos(pontos);
  // bolinhas nas pontas: a cara de osso
  for (const p of [pontos[0], pontos[pontos.length - 1]]) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// O rosto muda com o estado: neutro, gritando ou feliz
function desenharRosto() {
  ctx.lineWidth = 2;
  ctx.strokeStyle = COR.boneco;
  ctx.fillStyle = COR.boneco;

  if (boneco.fase === "aliviado") {
    // olhos fechados de alegria (^ ^) e sorriso
    ctx.beginPath();
    ctx.arc(-6, 18, 3, Math.PI, 0);
    ctx.moveTo(3, 18); // pula para o comeco do outro olho, sem riscar
    ctx.arc(6, 18, 3, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 24, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (boneco.medo > 0.5) {
    // olhos arregalados (branco grande, pupila pequena) e boca gritando
    for (const lado of [-1, 1]) {
      ctx.fillStyle = COR.dente;
      ctx.beginPath();
      ctx.arc(lado * 7, 15, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COR.pupila;
      ctx.beginPath();
      ctx.arc(lado * 7, 15, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COR.boca;
    ctx.beginPath();
    ctx.ellipse(0, 29, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // neutro: dois pontinhos e uma boca reta
    ctx.beginPath();
    ctx.arc(-6, 17, 2, 0, Math.PI * 2);
    ctx.arc(6, 17, 2, 0, Math.PI * 2);
    ctx.fill();
    linha(-6, 27, 6, 27);
  }
}

// Uma parte inteira (ou encolhendo durante a mordida)
function desenharParte(parte, s) {
  const m = meioDaParte(parte);
  ctx.save();
  ctx.globalAlpha = s;        // vai ficando transparente
  ctx.translate(m.x, m.y);    // leva o "zero" para o meio da parte
  ctx.scale(s, s);            // encolhe em volta do meio
  ctx.translate(-m.x, -m.y);  // volta o "zero"

  ctx.strokeStyle = COR.boneco;
  ctx.lineWidth = 4;
  if (parte.tipo === "circulo") {
    ctx.beginPath();
    ctx.arc(parte.x, parte.y, parte.raio, 0, Math.PI * 2);
    ctx.stroke();
    desenharRosto();
  } else {
    linhaPorPontos(pontosDaParte(parte));
  }
  ctx.restore();
}

function desenharBoneco() {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = COR.corda;
  ctx.lineWidth = 3;

  if (boneco.fase === "aliviado") {
    // so sobrou um pedaco de corda na viga
    linha(MEDIDA.pivoX, MEDIDA.pivoY, MEDIDA.pivoX, MEDIDA.pivoY + 14);
    // no chao ele da pulinhos de festa (abs do seno: so para cima)
    const pulo = boneco.noChao && !MOVIMENTO_REDUZIDO ? Math.abs(Math.sin(boneco.tempo * 6)) * 12 : 0;
    ctx.translate(boneco.x, boneco.y - pulo);
    ctx.rotate(boneco.giro); // a inclinacao do balanco, voltando a 0 aos poucos
  } else {
    // pendurado: gira em volta da ponta da viga
    ctx.translate(MEDIDA.pivoX, MEDIDA.pivoY);
    ctx.rotate(anguloBalanco());
    linha(0, 0, 0, MEDIDA.corda);
    ctx.translate(0, MEDIDA.corda);
  }

  for (let i = 0; i < PARTES.length; i++) {
    const s = boneco.escala[i];
    if (s < 1) desenharOsso(PARTES[i]);      // comida (ou sendo comida)
    if (s > 0) desenharParte(PARTES[i], s);  // ainda tem alguma coisa
  }
  ctx.restore();
}
