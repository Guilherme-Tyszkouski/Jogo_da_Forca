// palco.js: o laco do jogo e o desenho geral do canvas
// (palavra, informacoes, recado do palco e caixa de fim).

// A lousa e o pincel
const tela = document.getElementById("tela");
const ctx = tela.getContext("2d");

// Deixa o palco pronto para uma partida nova: boneco inteiro pendurado,
// piranha nadando sem mordidas na fila, nada voando e a tela parada
function prepararPalco() {
  prepararBoneco();
  prepararPiranha();
  particulas = [];
  cenario.tremida = 0;
}

// Muda tudo que se mexe com o tempo. dt = segundos desde o ultimo quadro.
function atualizar(dt) {
  atualizarCenario(dt);
  atualizarPiranha(dt);
  atualizarBoneco(dt);
  atualizarParticulas(dt);

  // A partida acabou e todas as animacoes terminaram? Agora sim: tela de fim.
  if (estado.fase !== "jogando" && !estado.fimAnunciado && !animando()) {
    fimDasMordidas();
  }
}

// Ainda tem animacao que precisa terminar antes da tela de fim?
function animando() {
  return piranhaComendo() || piranhaSaindo() || bonecoCaindo();
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

// A palavra: tracinho para cada letra, e a letra em cima se ja acertou
function desenharPalavra() {
  // Espaco de cada letra: no maximo 40, menor se a palavra for comprida
  const largura = Math.min(40, (tela.width - 40) / estado.palavra.length);
  const total = estado.palavra.length * largura;
  const inicioX = (tela.width - total) / 2; // centraliza
  const y = 410;
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

    // letra: mostra se acertou, ou (em vermelho) se perdeu e a tela de fim chegou
    if (estado.certas.includes(letra)) {
      ctx.fillStyle = COR.texto;
      ctx.fillText(letra, x, y);
    } else if (estado.fase === "perdeu" && estado.fimAnunciado) {
      ctx.fillStyle = COR.erro;
      ctx.fillText(letra, x, y);
    }
  }
}

// Lado direito: categoria e erros (acima do lago). As letras erradas
// ficam na fileira de chutes embaixo do palco, entao nao repetem aqui.
// Fontes grandes porque no celular o canvas encolhe para quase metade
// (a 360 px de tela, 30 px aqui viram uns 17 px).
const INFO_X = 320;       // a esquerda daqui ficam o boneco e a piranha
const INFO_LARGURA = 265; // ate x = 585, antes da borda do canvas

// Fonte em negrito do maior tamanho (ate "tamanho") em que o texto cabe
// na largura da coluna. Ex.: "PROFISSAO" fica um pouco menor que "PAIS".
function fonteQueCabe(texto, tamanho) {
  ctx.font = "bold " + tamanho + "px sans-serif";
  while (tamanho > 24 && ctx.measureText(texto).width > INFO_LARGURA) {
    tamanho -= 2;
    ctx.font = "bold " + tamanho + "px sans-serif";
  }
}

function desenharInfo() {
  if (estado.fimAnunciado) return; // a caixa de fim fica neste lugar
  ctx.textAlign = "left";

  ctx.fillStyle = COR.fraco;
  ctx.font = "30px sans-serif";
  ctx.fillText("Categoria", INFO_X, 64);

  ctx.fillStyle = COR.texto;
  fonteQueCabe(estado.categoria, 46);
  ctx.fillText(estado.categoria, INFO_X, 118);

  ctx.fillStyle = COR.fraco;
  ctx.font = "30px sans-serif";
  ctx.fillText("Erros: " + erros() + " de " + estado.maxErros, INFO_X, 178);
}

// O recado do palco, embaixo do lago (ex.: "PIRANHA MORDENDO!").
// Pode ter duas linhas, separadas por \n.
function desenharRecado() {
  ctx.textAlign = "center";
  ctx.fillStyle = COR.texto;
  ctx.font = "bold 24px sans-serif";
  const linhas = recadoPalco.split("\n");
  for (let i = 0; i < linhas.length; i++) {
    ctx.fillText(linhas[i], tela.width / 2, 328 + i * 30);
  }
}

// Caixa de fim, do lado direito (o boneco e a forca continuam a vista)
function desenharMensagem() {
  if (!estado.fimAnunciado) return;

  const meio = 415; // meio da caixa
  ctx.fillStyle = COR.sombra;
  ctx.fillRect(240, 26, 350, 206); // termina no chao, acima do lago

  ctx.textAlign = "center";
  ctx.font = "bold 40px sans-serif";
  if (estado.fase === "ganhou") {
    ctx.fillStyle = COR.acerto;
    ctx.fillText("Voce ganhou!", meio, 72);
  } else {
    ctx.fillStyle = COR.erro;
    ctx.fillText("Voce perdeu", meio, 72);
  }

  ctx.fillStyle = COR.fraco;
  ctx.font = "24px sans-serif";
  ctx.fillText("A palavra era", meio, 110);
  ctx.fillStyle = COR.texto;
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(estado.palavra, meio, 146);

  ctx.fillStyle = COR.fraco;
  ctx.font = "24px sans-serif";
  ctx.fillText("Enter ou Proxima partida", meio, 188);
  ctx.fillText("para jogar de novo", meio, 218);
}

// Desenhar: apaga tudo e pinta de novo, na ordem (o ultimo fica por cima)
function desenhar() {
  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, tela.width, tela.height); // "apaga" a lousa

  ctx.save();
  aplicarTremida();        // empurra tudo alguns pixels (se estiver tremendo)
  desenharCenario();       // lago, margem e forca
  desenharInfo();
  desenharBoneco();
  desenharPiranha();
  desenharAguaDaFrente();  // por cima da piranha: ela fica "dentro" do lago
  desenharParticulas();
  desenharRecado();
  desenharPalavra();
  desenharMensagem();
  ctx.restore();
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
