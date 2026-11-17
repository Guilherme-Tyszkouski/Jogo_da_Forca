// piranha.js: a maquina de estados da piranha e o desenho dela.
// Ela mora no lago, salta (bote) para morder e volta para a agua.

const piranha = {
  fase: "nadando", // "nadando" | "bote" | "mordendo" | "recuando" | "indo_embora"
  x: 260, y: 0,    // posicao do centro do corpo
  direcao: -1,     // -1 = olhando para a esquerda, 1 = para a direita
  alvo: 0,         // numero da parte que ela vai comer
  fila: [],        // mordidas esperando a vez (erros rapidos)
  tempo: 0,        // relogio do sobe e desce na agua
  tempoMordida: 0, // quanto tempo ja passou mordendo
  boca: 0,         // 0 = fechada, 1 = toda aberta
  voltaX: 0,       // onde ela cai de volta na agua
};

const NADO = 70;              // px/s nadando de um lado para o outro
const NADO_MIN = 200;         // trecho do lago onde ela vai e volta
const NADO_MAX = 320;
const VELOCIDADE_BOTE = 900;  // px/s no salto e na volta
const VELOCIDADE_SAIDA = 260; // px/s indo embora
const DURACAO_MORDIDA = 0.5;  // segundos mastigando
const BOCA_FRENTE = 34;       // distancia do centro da piranha ate a boca
const FORA_X = 680;           // passou daqui (indo embora), saiu de cena

// Na agua, o centro dela fica um pouco abaixo da superficie
function alturaNaAgua() {
  return MEDIDA.agua + 18;
}

// Volta ao lago, nadando, sem mordidas pendentes
function prepararPiranha() {
  piranha.fase = "nadando";
  piranha.x = 260;
  piranha.y = alturaNaAgua();
  piranha.direcao = -1;
  piranha.fila = [];
  piranha.boca = 0;
}

// Tem mordida acontecendo ou esperando na fila?
function piranhaComendo() {
  return piranha.fila.length > 0 || piranha.fase === "bote" ||
         piranha.fase === "mordendo" || piranha.fase === "recuando";
}

// Ainda esta nadando para fora do lago (depois da vitoria)?
function piranhaSaindo() {
  return piranha.fase === "indo_embora" && piranha.x < FORA_X;
}

// ---------------------------------------------------------- atualizar (animacao)

// Onde o CORPO precisa parar para a BOCA ficar na parte
function pontoDeMordida() {
  const c = centroDaParte(piranha.alvo);
  return { x: c.x - piranha.direcao * BOCA_FRENTE, y: c.y };
}

// Anda em direcao ao ponto (px, py) com uma velocidade. Devolve true se chegou.
function andarAte(px, py, velocidade, dt) {
  const dx = px - piranha.x;
  const dy = py - piranha.y;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  const passo = velocidade * dt; // quanto anda neste quadro

  if (distancia <= passo) {
    piranha.x = px;
    piranha.y = py;
    return true;
  }
  piranha.x += (dx / distancia) * passo;
  piranha.y += (dy / distancia) * passo;
  return false;
}

// Salta da agua em direcao a proxima parte
function comecarBote(numeroDaParte) {
  piranha.alvo = numeroDaParte;
  piranha.direcao = piranha.x < centroDaParte(numeroDaParte).x ? 1 : -1; // vira para a parte
  piranha.boca = 0.4;
  soltarParticulas(piranha.x, MEDIDA.agua, 10, COR.aguaClara, 260); // respingo da saida
  if (MOVIMENTO_REDUZIDO) {
    const p = pontoDeMordida(); // sem salto: aparece ja na parte
    piranha.x = p.x;
    piranha.y = p.y;
    comecarMordida();
  } else {
    piranha.fase = "bote";
  }
}

// Chegou na parte: mastiga, solta migalhas e respingos, e a tela treme
function comecarMordida() {
  piranha.fase = "mordendo";
  piranha.tempoMordida = 0;
  const c = centroDaParte(piranha.alvo);
  soltarParticulas(c.x, c.y, 10, COR.boneco, 240);   // migalhas
  soltarParticulas(c.x, c.y, 5, COR.aguaClara, 200); // agua pingando dela
  comecarTremida();
  mostrarNoPalco("PIRANHA MORDENDO!");
}

// Volta para a agua levando a parte
function comecarRecuo() {
  piranha.fase = "recuando";
  piranha.boca = 0.2;
  // cai no lago, no trecho onde ela nada
  piranha.voltaX = Math.max(NADO_MIN, Math.min(NADO_MAX, piranha.x + piranha.direcao * 40));
  if (MOVIMENTO_REDUZIDO) {
    piranha.x = piranha.voltaX;
    piranha.y = alturaNaAgua();
    chegouNaAgua();
  }
}

// Caiu na agua: tem mais mordida na fila? Salta de novo. Se nao, nada.
function chegouNaAgua() {
  soltarParticulas(piranha.x, MEDIDA.agua, 10, COR.aguaClara, 260); // respingo
  if (piranha.fila.length > 0) {
    comecarBote(piranha.fila.shift());
  } else {
    piranha.fase = "nadando";
    piranha.boca = 0;
  }
}

// A maquina de estados da piranha
function atualizarPiranha(dt) {
  piranha.tempo += dt;

  if (piranha.fase === "nadando") {
    if (piranha.fila.length > 0) {
      comecarBote(piranha.fila.shift()); // tem mordida na fila
    } else if (estado.fase === "ganhou") {
      piranha.fase = "indo_embora";      // perdeu a janta: vai embora
      piranha.direcao = 1;
      if (MOVIMENTO_REDUZIDO) piranha.x = FORA_X;
    } else if (!MOVIMENTO_REDUZIDO) {
      // vai e volta; vira quando chega numa ponta do trecho
      piranha.x += piranha.direcao * NADO * dt;
      if (piranha.x < NADO_MIN) piranha.direcao = 1;
      if (piranha.x > NADO_MAX) piranha.direcao = -1;
      piranha.y = alturaNaAgua() + Math.sin(piranha.tempo * 3) * 3;
    }
    return;
  }

  if (piranha.fase === "bote") {
    const p = pontoDeMordida();
    if (andarAte(p.x, p.y, VELOCIDADE_BOTE, dt)) comecarMordida();
    return;
  }

  if (piranha.fase === "mordendo") {
    piranha.tempoMordida += dt;
    // fica grudada na parte (o boneco balanca)
    const p = pontoDeMordida();
    piranha.x = p.x;
    piranha.y = p.y;
    // abre e fecha a boca 5 vezes por segundo (seno vai de -1 a 1)
    piranha.boca = (Math.sin(piranha.tempoMordida * Math.PI * 2 * 5) + 1) / 2;
    // a parte encolhe de 1 ate 0 durante a mordida
    boneco.escala[piranha.alvo] = Math.max(0, 1 - piranha.tempoMordida / DURACAO_MORDIDA);

    if (piranha.tempoMordida >= DURACAO_MORDIDA) {
      boneco.escala[piranha.alvo] = 0; // comida de vez
      avisarMordida(piranha.alvo);     // so agora o leitor de tela fica sabendo
      comecarRecuo();
    }
    return;
  }

  if (piranha.fase === "recuando") {
    if (andarAte(piranha.voltaX, alturaNaAgua(), VELOCIDADE_BOTE, dt)) chegouNaAgua();
    return;
  }

  if (piranha.fase === "indo_embora" && piranha.x < FORA_X) {
    piranha.x += VELOCIDADE_SAIDA * dt; // nada para a direita ate sair
    piranha.y = alturaNaAgua();
  }
}

// ---------------------------------------------------------- desenho

// Desenhada olhando para a direita; virada com scale e inclinada com rotate
function desenharPiranha() {
  if (piranha.x >= FORA_X) return; // ja foi embora

  // nariz para cima no salto, para baixo na volta
  let inclinacao = 0;
  if (piranha.fase === "bote") inclinacao = -0.35;
  if (piranha.fase === "recuando") inclinacao = 0.35;

  ctx.save();
  ctx.translate(piranha.x, piranha.y);
  ctx.scale(piranha.direcao, 1); // direcao -1 espelha o desenho
  ctx.rotate(inclinacao);

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

  // levando a parte comida de volta para a agua: um pedaco branco na boca
  if (piranha.fase === "recuando") {
    ctx.strokeStyle = COR.boneco;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    linha(24, 6, 44, 12);
  }

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
