// main.js: liga tudo e inicia o laco do jogo.
// E o ultimo script: quando ele roda, todos os outros ja foram lidos.

criarTeclado();              // botoes de letra (teclado.js)
ligarTeclado();              // cliques e teclado fisico (teclado.js)
novaPartida();               // sorteia a primeira palavra (estado.js)
requestAnimationFrame(laco); // atualizar -> desenhar -> proximo quadro (palco.js)
