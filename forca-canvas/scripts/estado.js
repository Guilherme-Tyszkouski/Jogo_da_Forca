// estado.js: as regras do jogo (palavra, chutes, erros, fim).
// Nada de desenho aqui. So declara: quem chama as funcoes e o main.js.

const areaStatus = document.getElementById("status"); // texto para leitor de tela

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
  maxErros: 6,
  fase: "jogando", // "jogando" | "ganhou" | "perdeu"
};

// Quantos erros: e so o tamanho da lista de erradas (sem guardar duas vezes)
function erros() {
  return estado.erradas.length;
}

// Sorteia uma palavra (diferente da anterior) e zera tudo
function novaPartida() {
  // O foco estava no botao "Nova partida"? Ele vai sumir, entao o foco
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
  estado.fase = "jogando";

  // boneco inteiro de novo e piranha fora da tela
  boneco.escala = [1, 1, 1, 1, 1, 1];
  boneco.tempoPulo = 0;
  piranha.fase = "parada";
  piranha.fila = [];
  piranha.x = -100;
  migalhas = [];

  atualizarTeclado();
  if (focoNoBotao) teclado.firstElementChild.focus();
  avisar("Nova partida. Categoria " + estado.categoria + ", " +
         estado.palavra.length + " letras. Palavra: " + textoPalavra() + ".");
}

// So comeca outra partida se a atual acabou e a piranha terminou
function reiniciar() {
  if (estado.fase !== "jogando" && !animando()) novaPartida();
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

  atualizarTeclado();
  if (!verificarFim()) avisarJogada(letra); // se acabou, o aviso de fim ja foi dado
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
  } else {
    texto = "Errou: nao tem " + letra + ". A piranha vai comer " + PARTES[erros() - 1].nome +
            ". Erros: " + erros() + " de " + estado.maxErros + ".";
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

// Decide se a partida acabou. Devolve true se acabou.
function verificarFim() {
  if (palavraCompleta()) {
    estado.fase = "ganhou";
    atualizarTeclado();
    if (animando()) {
      // a piranha ainda esta voando: o Enter so vale depois (fimDasMordidas)
      avisar("Voce ganhou! A palavra era " + estado.palavra + ".");
    } else {
      fimDasMordidas(); // nada voando: ja mostra o fim
    }
    return true;
  }
  if (erros() >= estado.maxErros) {
    // A regra ja decidiu: perdeu. O aviso de fim espera a ultima mordida.
    estado.fase = "perdeu";
    atualizarTeclado();
    avisar("Errou: nao tem " + estado.erradas[erros() - 1] +
           ". A piranha vai comer " + PARTES[erros() - 1].nome + ", a ultima parte.");
    return true;
  }
  return false; // ainda jogando
}

// Chamado quando a piranha termina a ultima mordida da fila
// (ou na hora, se ganhou sem nada voando)
function fimDasMordidas() {
  atualizarTeclado(); // mostra o botao Nova partida, se a partida acabou
  if (estado.fase === "jogando") return; // so acabou uma mordida, segue o jogo

  if (estado.fase === "perdeu") {
    avisar("Voce perdeu. A piranha comeu o boneco inteiro. A palavra era " +
           estado.palavra + ". Aperte Enter ou o botao Nova partida.");
  } else {
    avisar("Voce ganhou! A palavra era " + estado.palavra +
           ". Aperte Enter ou o botao Nova partida.");
  }
  // as letras ficaram travadas: o foco vai para o botao, e nao se perde
  botaoNova.focus();
}

// Escreve o status na regiao aria-live (o leitor de tela anuncia).
// Apaga antes e escreve um pouco depois: assim uma frase igual a anterior
// tambem e lida de novo.
function avisar(texto) {
  areaStatus.textContent = "";
  setTimeout(function () {
    areaStatus.textContent = texto;
  }, 50);
}
