// tema.js: as cores e as medidas do canvas em um lugar so.
// O canvas nao le o CSS, entao as cores dele ficam aqui.
// Nenhum outro script escreve cor solta: todos usam COR.alguma.

// Cores. As marcadas com "paleta 3.3" vem do plano v2
// (docs/piranha-hangman-v2.md); hoje elas existem so aqui e viram token CSS
// em blocks/page.css na Fase 3. As outras sao cores proprias do desenho.
const COR = {
  fundo: "#1E1E24",         // paleta 3.3 (fundo do palco); vira token CSS na Fase 3
  forca: "#c9a46b",         // madeira da forca
  corda: "#d8c8a0",
  boneco: "#f5f5f5",
  texto: "#e6e6e6",         // mesmo valor do --color-text de hoje
  acerto: "#7ee787",        // mesmo valor do --color-primary de hoje
  erro: "#ff7b72",          // mesmo valor do --color-danger de hoje
  fraco: "#b4b9bf",
  agua: "#2B6CB0",          // paleta 3.3 (agua do lago); vira token CSS na Fase 3
  aguaClara: "#8fc1ef",     // ondas, respingos e gotas de suor
  margem: "#4a3b2a",        // terra da margem do lago
  grama: "#81B64C",         // paleta 3.3 (verde principal); vira token CSS na Fase 3
  osso: "#9A9A9A",          // paleta 3.3 (texto apagado); osso no lugar da parte comida
  piranha: "#8B3FD9",       // paleta 3.3 (roxo da piranha); vira token CSS na Fase 3
  piranhaEscura: "#5e2a94", // cauda, barbatana e mandibula
  boca: "#24082f",          // dentro da boca (da piranha e do boneco gritando)
  dente: "#ffffff",         // dentes e branco do olho
  pupila: "#000000",        // bolinha preta do olho
  sombra: "rgba(0, 0, 0, 0.85)", // fundo escuro quase opaco da caixa de fim
};

// Medidas do cenario, em pixels do canvas (600 x 440)
const MEDIDA = {
  pivoX: 200,     // ponta da viga, onde a corda esta amarrada
  pivoY: 40,
  corda: 40,      // tamanho da corda ate o alto da cabeca
  chao: 232,      // altura do chao da margem
  agua: 240,      // altura da superficie do lago
  fundoLago: 296, // onde o lago termina embaixo
  margemFim: 140, // a margem vai de x = 0 ate aqui; dai para a direita e lago
};

// A pessoa pediu "menos movimento" no sistema? Entao nada voa, balanca ou
// treme: a piranha aparece direto na parte e o boneco nao pula.
const MOVIMENTO_REDUZIDO = matchMedia("(prefers-reduced-motion: reduce)").matches;
