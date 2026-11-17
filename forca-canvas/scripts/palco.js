// palco.js: o laco do jogo e o desenho geral do canvas
// (forca, palavra, informacoes e caixa de fim).

// A lousa e o pincel
const tela = document.getElementById("tela");
const ctx = tela.getContext("2d");

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
  ctx.fillStyle = COR.sombra;
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
