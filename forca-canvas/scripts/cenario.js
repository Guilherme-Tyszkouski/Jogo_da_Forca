// cenario.js: a margem, o lago, a forca e a tremida de tela
// (com a opcao de desligar a tremida).

const caixaTremer = document.getElementById("tremer"); // checkbox "Tremer a tela"
const CHAVE_TREMER = "forca-canvas-tremer";            // nome no localStorage

const cenario = {
  tempo: 0,    // relogio das ondas
  tremida: 0,  // quantos pixels a tela treme agora (0 = parada)
};

const TREMIDA_FORCA = 6;   // pixels no comeco da tremida
const TREMIDA_QUEDA = 30;  // pixels por segundo: 6 / 30 = 0,2 s de tremida

// ---------------------------------------------------------- tremida

// Treme so se o checkbox estiver ligado e a pessoa nao pediu menos movimento
function comecarTremida() {
  if (caixaTremer.checked && !MOVIMENTO_REDUZIDO) cenario.tremida = TREMIDA_FORCA;
}

function atualizarCenario(dt) {
  cenario.tempo += dt;
  cenario.tremida = Math.max(0, cenario.tremida - TREMIDA_QUEDA * dt); // diminui com dt
}

// Empurra o desenho todo para um lado sorteado (chamado antes de desenhar)
function aplicarTremida() {
  if (cenario.tremida <= 0) return;
  const dx = (Math.random() * 2 - 1) * cenario.tremida;
  const dy = (Math.random() * 2 - 1) * cenario.tremida;
  ctx.translate(dx, dy);
}

// Liga o checkbox. Com "menos movimento" ele fica desligado e travado,
// mas continua no Tab (aria-disabled em vez de disabled) e mostra o motivo.
// A escolha fica guardada no navegador (try/catch: o localStorage pode
// estar bloqueado, e ai o jogo segue sem lembrar).
function ligarAjustes() {
  if (MOVIMENTO_REDUZIDO) {
    caixaTremer.checked = false;
    caixaTremer.setAttribute("aria-disabled", "true");
    caixaTremer.closest(".settings__label").classList.add("settings__label_disabled");
    document.getElementById("tremerMotivo").hidden = false; // "seu sistema pede menos movimento"
  } else {
    try {
      const salvo = localStorage.getItem(CHAVE_TREMER);
      if (salvo !== null) caixaTremer.checked = salvo === "sim";
    } catch (erro) {
      // sem localStorage: fica o valor do HTML (ligado)
    }
  }
  caixaTremer.addEventListener("change", function () {
    // travado: desfaz o clique e nao guarda nada
    if (MOVIMENTO_REDUZIDO) {
      caixaTremer.checked = false;
      return;
    }
    try {
      localStorage.setItem(CHAVE_TREMER, caixaTremer.checked ? "sim" : "nao");
    } catch (erro) {
      // nao deu para guardar: vale so ate fechar a pagina
    }
  });
}

// ---------------------------------------------------------- desenho

// Margem de terra (com grama em cima) e o lago atras de tudo
function desenharCenario() {
  const larguraLago = tela.width - MEDIDA.margemFim;
  const alturaLago = MEDIDA.fundoLago - MEDIDA.agua;

  // lago
  ctx.fillStyle = COR.agua;
  ctx.fillRect(MEDIDA.margemFim, MEDIDA.agua, larguraLago, alturaLago);

  // ondinhas na superficie (paradas com "menos movimento")
  const onda = MOVIMENTO_REDUZIDO ? 0 : cenario.tempo * 2;
  ctx.strokeStyle = COR.aguaClara;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = MEDIDA.margemFim; x <= tela.width; x += 10) {
    const y = MEDIDA.agua + Math.sin(x * 0.05 + onda) * 2;
    if (x === MEDIDA.margemFim) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // margem: um barranco que desce ate o fundo do lago
  ctx.fillStyle = COR.margem;
  ctx.beginPath();
  ctx.moveTo(0, MEDIDA.chao);
  ctx.lineTo(MEDIDA.margemFim, MEDIDA.chao);
  ctx.lineTo(MEDIDA.margemFim + 14, MEDIDA.fundoLago);
  ctx.lineTo(0, MEDIDA.fundoLago);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COR.grama;
  ctx.lineWidth = 4;
  linha(0, MEDIDA.chao, MEDIDA.margemFim, MEDIDA.chao);

  desenharForca();
}

// A forca de madeira fincada na margem: poste, viga e escora
function desenharForca() {
  ctx.strokeStyle = COR.forca;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  linha(30, MEDIDA.chao, 90, MEDIDA.chao);          // tabua da base
  linha(50, MEDIDA.chao, 50, MEDIDA.pivoY);         // poste
  linha(50, MEDIDA.pivoY, MEDIDA.pivoX, MEDIDA.pivoY); // viga
  linha(50, MEDIDA.pivoY + 40, 90, MEDIDA.pivoY);   // escora
}

// Agua "da frente", meio transparente: o que esta embaixo da superficie
// (a piranha nadando) fica azulado, como se estivesse dentro do lago
function desenharAguaDaFrente() {
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = COR.agua;
  ctx.fillRect(MEDIDA.margemFim, MEDIDA.agua + 4,
               tela.width - MEDIDA.margemFim, MEDIDA.fundoLago - MEDIDA.agua - 4);
  ctx.globalAlpha = 1;
}
