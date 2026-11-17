// piranha.js: a maquina de estados da piranha, as migalhas e o desenho dela.

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

let migalhas = []; // pedacinhos que voam na mordida

// A piranha ainda tem trabalho? (voando ou com mordida na fila)
function animando() {
  return piranha.fase !== "parada" || piranha.fila.length > 0;
}

// ---------------------------------------------------------- atualizar (animacao)

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

// ---------------------------------------------------------- desenho

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
  ctx.fillStyle = COR.dente;
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
  ctx.fillStyle = COR.dente;
  triangulo(12, -1, 15, -9, 18, -2);
  triangulo(19, -2, 22, -10, 25, -3);
  triangulo(26, -3, 29, -11, 32, -4);
  ctx.restore();

  // olho: branco com pupila
  ctx.fillStyle = COR.dente;
  ctx.beginPath();
  ctx.arc(10, -8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COR.pupila;
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
