// teclado.js: o teclado na tela (botoes de letra), o botao Nova partida
// e o teclado fisico. Os ouvintes so sao ligados quando o main.js chama.

const teclado = document.getElementById("teclado");         // botoes de letra
const botaoNova = document.getElementById("novaPartida");   // botao "Nova partida"

// ---------------------------------------------------------- teclado na tela

// Cria um botao para cada letra, uma vez so
function criarTeclado() {
  for (const letra of ALFABETO) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.classList.add("keyboard__key"); // bloco BEM do teclado
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

    botao.classList.toggle("keyboard__key_state_correct", certa);
    botao.classList.toggle("keyboard__key_state_wrong", errada);
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

// ---------------------------------------------------------- teclado fisico

function teclaApertada(evento) {
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
}

// Liga os ouvintes: botao Nova partida e teclado fisico
function ligarTeclado() {
  botaoNova.addEventListener("click", reiniciar);
  document.addEventListener("keydown", teclaApertada);
}
