// estado.js: as regras do jogo (palavra, chutes, erros, fim) e os avisos.
// Nada de desenho aqui. So declara: quem chama as funcoes e o main.js.

const areaStatus = document.getElementById("status"); // texto para leitor de tela
const textoResultado = document.getElementById("resultado"); // lido junto com o botao Proxima partida
let recadoPalco = ""; // recado curto que o palco desenha embaixo do lago

// Lista de palavras do laboratorio (so para treino).
// No jogo de verdade a palavra fica no servidor (regra de ouro do AGENTS.md).
const PALAVRAS = [
  { palavra: "BANANA",     categoria: "FRUTA" },
  { palavra: "ABACAXI",    categoria: "FRUTA" },
  { palavra: "MORANGO",    categoria: "FRUTA" },
  { palavra: "CACHORRO",   categoria: "ANIMAL" },
  { palavra: "GIRAFA",     categoria: "ANIMAL" },
  { palavra: "TARTARUGA",  categoria: "ANIMAL" },
  { palavra: "BRASIL",     categoria: "PAIS" },
  { palavra: "PORTUGAL",   categoria: "PAIS" },
  { palavra: "JAPAO",      categoria: "PAIS" },
  { palavra: "MECANICO",   categoria: "PROFISSAO" },
  { palavra: "PROFESSOR",  categoria: "PROFISSAO" },
  { palavra: "CADEIRA",    categoria: "OBJETO" },
  { palavra: "TECLADO",    categoria: "OBJETO" },
  { palavra: "CAMINHAO",   categoria: "VEICULO" },
];

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// O estado do jogo: so numeros e textos, nada de desenho aqui
const estado = {
  palavra: "",
  categoria: "",
  certas: [],   // letras chutadas que estao na palavra
  erradas: [],  // letras chutadas que NAO estao na palavra
  chutadas: [], // todas as letras chutadas, na ordem do chute (fileira de chutes)
  maxErros: 6,
  fase: "jogando",     // "jogando" | "ganhou" | "perdeu"
  fimAnunciado: false, // a tela de fim ja apareceu? (so depois das animacoes)
};

// Quantos erros: e so o tamanho da lista de erradas (sem guardar duas vezes)
function erros() {
  return estado.erradas.length;
}

// Sorteia uma palavra (diferente da anterior) e zera tudo
function novaPartida() {
  // O foco estava no botao "Proxima partida"? Ele vai sumir, entao o foco
  // passa para a primeira letra (senao cai no nada).
  const focoNoBotao = document.activeElement === botaoNova;
  let sorteio;
  do {
    sorteio = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
  } while (sorteio.palavra === estado.palavra); // repetiu? sorteia de novo

  estado.palavra = sorteio.palavra;
  estado.categoria = sorteio.categoria;
  estado.certas = [];
  estado.erradas = [];
  estado.chutadas = [];
  estado.fase = "jogando";
  estado.fimAnunciado = false;

  textoResultado.textContent = "";

  prepararPalco(); // boneco, piranha, particulas e tremida do zero (palco.js)

  atualizarTeclado();
  if (focoNoBotao) teclado.firstElementChild.focus();
  mostrarNoPalco("Escolha uma letra!");
  avisar("Nova partida. Categoria " + estado.categoria + ", " +
         estado.palavra.length + " letras. Palavra: " + textoPalavra() + ".");
}

// So comeca outra partida depois que a tela de fim apareceu
function reiniciar() {
  if (estado.fimAnunciado) novaPartida();
}

// O jogador chutou uma letra (vem do teclado fisico ou dos botoes)
function chutar(letra) {
  if (estado.fase !== "jogando") return; // partida acabou, ignora

  // Ja chutou essa letra? Avisa e nao conta de novo
  if (estado.certas.includes(letra) || estado.erradas.includes(letra)) {
    avisar("Voce ja tentou a letra " + letra + ".");
    return;
  }

  if (estado.palavra.includes(letra)) {
    estado.certas.push(letra);
  } else {
    estado.erradas.push(letra);
    piranha.fila.push(erros() - 1); // a piranha vai comer a proxima parte
  }
  estado.chutadas.push(letra); // guarda a ordem para a fileira de chutes

  atualizarTeclado();
  // Na derrota o verificarFim ja deu o aviso. Na vitoria e uma jogada comum:
  // o "Voce ganhou" so vem no fimDasMordidas, depois da ultima mordida.
  if (!verificarFim()) avisarJogada(letra);
}

// Quantas vezes a letra aparece na palavra
function contar(letra) {
  let total = 0;
  for (const l of estado.palavra) {
    if (l === letra) total++;
  }
  return total;
}

// A palavra como texto para o leitor de tela: "_ A _ A _ A"
function textoPalavra() {
  const partes = [];
  for (const letra of estado.palavra) {
    partes.push(estado.certas.includes(letra) ? letra : "_");
  }
  return partes.join(" ");
}

// Monta o aviso de uma jogada: acerto/erro, palavra e letras erradas
function avisarJogada(letra) {
  let texto;
  const vezes = contar(letra);
  if (vezes > 0) {
    texto = "Acertou: a letra " + letra + " aparece " + vezes + (vezes === 1 ? " vez." : " vezes.");
    mostrarNoPalco("Acertou! Tem " + letra + ".");
  } else {
    // Nao fala da piranha aqui: a parte so e anunciada quando a mordida
    // termina (avisarMordida), para o aviso bater com a animacao.
    texto = "Errou: nao tem " + letra + ". Erros: " + erros() + " de " + estado.maxErros + ".";
    mostrarNoPalco("Errou! Nao tem " + letra + ".");
  }
  texto += " Palavra: " + textoPalavra() + ".";
  if (estado.erradas.length > 0) {
    texto += " Letras erradas: " + estado.erradas.join(", ") + ".";
  }
  avisar(texto);
}

// Ganhou se todas as letras da palavra foram acertadas
function palavraCompleta() {
  for (const letra of estado.palavra) {
    if (!estado.certas.includes(letra)) return false;
  }
  return true;
}

// Decide se a partida acabou. Devolve true so se ja deu o aviso (derrota).
// A tela de fim NAO aparece aqui: o palco.js chama fimDasMordidas quando
// todas as animacoes pararem (ultima mordida, ou boneco na margem).
function verificarFim() {
  if (palavraCompleta()) {
    // Ganhou, mas a piranha ainda pode ter mordidas na fila: nada de
    // "Voce ganhou" agora (quem avisa e o fimDasMordidas)
    estado.fase = "ganhou";
    atualizarTeclado();
    return false;
  }
  if (erros() >= estado.maxErros) {
    estado.fase = "perdeu";
    atualizarTeclado();
    const letra = estado.erradas[erros() - 1];
    avisar("Errou: nao tem " + letra + ". Erros: " + erros() + " de " + estado.maxErros + ".");
    mostrarNoPalco("Errou! Nao tem " + letra + ".");
    return true;
  }
  return false; // ainda jogando
}

// A piranha terminou uma mordida: so agora avisa qual parte foi devorada
function avisarMordida(numero) {
  avisar("Piranha mordendo! " + PARTES[numero].aviso + ".");
  mostrarNoPalco("PIRANHA MORDENDO!\n" + PARTES[numero].aviso + "!");
}

// Chamado pelo palco.js quando a partida acabou e as animacoes pararam
function fimDasMordidas() {
  estado.fimAnunciado = true;
  atualizarTeclado(); // mostra o botao Proxima partida

  let resultado;
  if (estado.fase === "perdeu") {
    resultado = "Voce perdeu. A piranha comeu o boneco inteiro. A palavra era " + estado.palavra + ".";
    mostrarNoPalco("A piranha devorou o boneco!");
  } else {
    resultado = "Voce ganhou! A palavra era " + estado.palavra + ".";
    mostrarNoPalco("Ufa! O boneco escapou!");
  }
  avisar(resultado + " Aperte Enter ou o botao Proxima partida.");
  // o botao "le" o resultado junto com o nome (aria-describedby="resultado")
  textoResultado.textContent = resultado;

  // So puxa o foco se ele estava perdido (no body) ou numa letra travada.
  // Se a pessoa esta em outro lugar (ex.: no checkbox), deixa onde esta.
  const foco = document.activeElement;
  if (foco === document.body || teclado.contains(foco)) botaoNova.focus();
}

// Escreve o status na regiao aria-live (o leitor de tela anuncia).
// Cada aviso entra como uma linha NOVA em vez de trocar o texto: assim o
// aviso do fim de uma mordida nao apaga o aviso do chute que acabou de sair
// (o leitor le os dois, na ordem). Ficam so as 3 ultimas linhas.
function avisar(texto) {
  const linhaNova = document.createElement("p");
  linhaNova.textContent = texto;
  areaStatus.appendChild(linhaNova);
  if (areaStatus.children.length > 3) areaStatus.firstElementChild.remove();
}

// Troca o recado curto que o palco desenha embaixo do lago
function mostrarNoPalco(texto) {
  recadoPalco = texto;
}
