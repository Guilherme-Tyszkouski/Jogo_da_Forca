// particulas.js: pedacinhos que voam e caem (migalhas, respingos, suor).

let particulas = [];

const GRAVIDADE_PARTICULA = 500; // px/s a cada segundo
const VIDA_PARTICULA = 0.6;      // segundos ate sumir

// Solta "quantidade" pedacinhos no ponto (x, y), com uma cor e uma forca
// (forca = velocidade maxima para cima, em px/s)
function soltarParticulas(x, y, quantidade, cor, forca) {
  if (MOVIMENTO_REDUZIDO) return; // sem pedacinhos voando
  for (let i = 0; i < quantidade; i++) {
    particulas.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * forca * 1.2, // para os lados
      vy: -Math.random() * forca,              // para cima
      vida: VIDA_PARTICULA,
      cor: cor,
      raio: 2 + Math.random() * 2,
    });
  }
}

// Caem com gravidade e somem quando a vida acaba
function atualizarParticulas(dt) {
  for (const p of particulas) {
    p.vy += GRAVIDADE_PARTICULA * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vida -= dt;
  }
  particulas = particulas.filter(function (p) { return p.vida > 0; });
}

function desenharParticulas() {
  for (const p of particulas) {
    ctx.globalAlpha = Math.max(0, p.vida / VIDA_PARTICULA); // somem aos poucos
    ctx.fillStyle = p.cor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
