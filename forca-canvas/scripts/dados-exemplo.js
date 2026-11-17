// dados-exemplo.js: dados de exemplo do painel (barra lateral e cards).
//
// ATENCAO: tudo aqui e FICTICIO. Os nicks, ratings, partidas e a liga foram
// inventados so para montar o layout da Fase 3 (sem backend). Na Fase 5 o
// painel.js passa a receber estes mesmos campos das Functions (D1), e este
// arquivo sai. O unico nome real e o do jogador logado (o proprio Guilherme).
//
// Paises: codigo de 2 letras (sigla) e o nome por extenso (para o leitor de tela).

const DADOS_EXEMPLO = {
  jogador: {
    nick: "Tyszkowski",
    rating: 402,
    pais: { sigla: "BR", nome: "Brasil" },
    online: true,
  },

  // Ultimas partidas, da mais nova para a mais velha.
  // resultado: "vitoria", "derrota" ou "empate" (do ponto de vista do jogador)
  // precisao: letras certas / letras chutadas, em % (plano, secao 6.4)
  historico: [
    {
      adversario: { nick: "Lambari_99", rating: 446, pais: { sigla: "BR", nome: "Brasil" } },
      resultado: "derrota",
      placar: "0 - 1",
      precisao: 58,
      data: "2026-11-16",
    },
    {
      adversario: { nick: "PacuVeloz", rating: 389, pais: { sigla: "PT", nome: "Portugal" } },
      resultado: "vitoria",
      placar: "1 - 0",
      precisao: 83,
      data: "2026-11-15",
    },
    {
      adversario: { nick: "MareVermelha", rating: 410, pais: { sigla: "AR", nome: "Argentina" } },
      resultado: "empate",
      placar: "1 - 1",
      precisao: 71,
      data: "2026-11-14",
    },
    {
      adversario: { nick: "Tucunare_Rex", rating: 377, pais: { sigla: "BR", nome: "Brasil" } },
      resultado: "vitoria",
      placar: "1 - 0",
      precisao: 90,
      data: "2026-11-12",
    },
  ],

  // Liga semanal (plano, secao 6.5): top 3 e a posicao do jogador
  liga: {
    nome: "Liga Bronze",
    totalJogadores: 30,
    top3: [
      { nick: "Cardume_Azul", pontos: 580 },
      { nick: "Lambari_99", pontos: 550 },
      { nick: "Baiacu42", pontos: 517 },
    ],
    posicaoJogador: 7,
    pontosJogador: 402,
  },

  // Temas (plano, Fase 9). imagem: arquivo em images/. criterio: so nos bloqueados
  temas: [
    { nome: "Classico", imagem: "./images/tema-classico.svg", liberado: true },
    { nome: "Lago", imagem: "./images/tema-lago.svg", liberado: true },
    { nome: "Por do sol", imagem: "./images/tema-por-do-sol.svg", liberado: true },
    { nome: "Noite", imagem: "./images/tema-noite.svg", liberado: false, criterio: "600 trofeus" },
    { nome: "Dourado", imagem: "./images/tema-dourado.svg", liberado: false, criterio: "Liga Ouro" },
    { nome: "Esqueleto", imagem: "./images/tema-esqueleto.svg", liberado: false, criterio: "50 vitorias" },
  ],
};
