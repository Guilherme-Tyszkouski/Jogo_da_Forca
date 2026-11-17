// tema.js: as cores do canvas em um lugar so.
// O canvas nao le o CSS, entao as cores dele ficam aqui.
// Nenhum outro script escreve cor solta: todos usam COR.alguma.

// Cores em um lugar so (fundo escuro, texto claro)
const COR = {
  fundo: "#1e1e2e",
  forca: "#c9a46b",
  boneco: "#f5f5f5",
  texto: "#e6e6e6",
  acerto: "#7ee787",
  erro: "#ff7b72",
  fraco: "#b4b9bf",
  piranha: "#8e44d6",       // corpo roxo
  piranhaEscura: "#5e2a94", // cauda, barbatana e mandibula
  boca: "#24082f",          // dentro da boca
  dente: "#ffffff",         // dentes e branco do olho
  pupila: "#000000",        // bolinha preta do olho
  sombra: "rgba(0, 0, 0, 0.85)", // fundo escuro quase opaco da caixa de fim
};

// A pessoa pediu "menos movimento" no sistema? Entao a piranha nao voa,
// nao balanca, nao solta migalhas e o boneco nao pula.
const MOVIMENTO_REDUZIDO = matchMedia("(prefers-reduced-motion: reduce)").matches;
