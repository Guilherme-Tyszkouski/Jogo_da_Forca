// teclado.js: o teclado na tela (botoes de letra), a fileira de letras ja
// chutadas, o botao Proxima partida e o teclado fisico.
// Os ouvintes so sao ligados quando o main.js chama.

const teclado = document.getElementById("teclado");           // botoes de letra
const botaoNova = document.getElementById("novaPartida");     // botao "Proxima partida"
const areaChutadas = document.getElementById("chutadas");     // fileira de chutes (pode faltar)

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
      // o botao usado fica travado e perderia o foco (cairia no BODY)
      if (botao.disabled) focarProximaLetra(botao);
    });
    teclado.appendChild(botao);
  }
}

// Passa o foco para a proxima letra livre (volta ao A depois do Z).
// Se nenhuma estiver livre (fim da partida), o foco vai para o botao
// Proxima partida quando ele aparecer (fimDasMordidas).
function focarProximaLetra(botao) {
  const botoes = Array.from(teclado.children);
  const inicio = botoes.indexOf(botao);
  for (let i = 1; i < botoes.length; i++) {
    const outro = botoes[(inicio + i) % botoes.length];
    if (!outro.disabled) {
      outro.focus();
      return;
    }
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
  // So aparece no fim, depois que todas as animacoes terminaram
  botaoNova.hidden = !estado.fimAnunciado;
  atualizarChutadas();
}

// ---------------------------------------------------------- letras chutadas

// Refaz a fileira de chutes: uma letra por chute, na ordem, verde ou vermelha.
// Em nova partida a lista esta vazia, entao a fileira fica limpa.
function atualizarChutadas() {
  if (areaChutadas === null) return; // pagina sem a fileira: nada a fazer
  areaChutadas.replaceChildren();    // apaga as letras antigas

  for (const letra of estado.chutadas) {
    const certa = estado.certas.includes(letra);
    const item = document.createElement("span");
    item.classList.add("guessed__letter");
    item.classList.add(certa ? "guessed__letter_state_correct" : "guessed__letter_state_wrong");
    item.textContent = letra;

    // A cor nao chega no leitor de tela: ele le "A, certa" / "B, errada"
    const legenda = document.createElement("span");
    legenda.classList.add("visually-hidden");
    legenda.textContent = certa ? ", certa" : ", errada";
    item.appendChild(legenda);

    areaChutadas.appendChild(item);
  }
}

// ---------------------------------------------------------- teclado fisico

// O foco esta num controle que nao e do jogo? Entao a tecla e dele.
// Vale para tudo dentro da barra lateral ou do cabecalho (menu do celular,
// links, botoes) e para links, campos e textos editaveis em qualquer lugar.
// O checkbox "Tremer a tela" e do jogo: com o foco nele as teclas seguem valendo.
// Sem barra nem cabecalho na pagina, closest() so devolve null: nada quebra.
function focoForaDoJogo(alvo) {
  if (alvo.closest(".sidebar, .header")) return true;
  if (alvo.isContentEditable) return true;
  if (alvo.tagName === "INPUT") return alvo.type !== "checkbox";
  return ["A", "SELECT", "TEXTAREA"].includes(alvo.tagName);
}

function teclaApertada(evento) {
  if (evento.repeat) return; // tecla segurada nao vale
  // Atalhos (Ctrl+F, Alt+Z, Cmd+C...) sao do navegador, nao do jogo
  if (evento.ctrlKey || evento.altKey || evento.metaKey) return;
  if (focoForaDoJogo(evento.target)) return;

  // Enter comeca outra partida, mas so quando a atual acabou
  // Se o foco esta num botao, o proprio navegador transforma o Enter em
  // clique nele; chamar reiniciar() aqui tambem faria o clique cair na letra A.
  // (Link e campo ja sairam acima, pelo focoForaDoJogo.)
  if (evento.key === "Enter") {
    if (evento.target.tagName !== "BUTTON") reiniciar();
    return;
  }

  // So aceita uma letra de A a Z
  const letra = evento.key.toUpperCase();
  if (/^[A-Z]$/.test(letra)) {
    const focado = document.activeElement; // guarda antes: o chute pode travar esse botao
    chutar(letra);
    // digitou a letra do botao que estava com o foco? ele travou: o foco
    // passa para a proxima letra livre (senao cairia no BODY)
    if (focado.disabled && teclado.contains(focado)) focarProximaLetra(focado);
  }
}

// Liga os ouvintes: botao Proxima partida e teclado fisico
function ligarTeclado() {
  botaoNova.addEventListener("click", reiniciar);
  document.addEventListener("keydown", teclaApertada);
}
