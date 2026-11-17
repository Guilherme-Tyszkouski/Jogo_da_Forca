// tema.js: as cores e as medidas do canvas em um lugar so.
// O canvas nao le o CSS, entao as cores dele ficam aqui.
// Nenhum outro script escreve cor solta: todos usam COR.alguma.

// Cores. As que tem um token do lado sao os mesmos valores das variaveis CSS
// de blocks/page.css (paleta 3.3 do docs/piranha-hangman-v2.md): mudou la,
// muda aqui. As outras sao cores proprias do desenho.
// Contraste do texto sobre o fundo do palco (#1E1E24), minimo 4.5:1:
// texto 14.2, fraco 5.9, acerto 6.9, erro 4.9.
const COR = {
  fundo: "#1E1E24",         // --color-stage (fundo do palco)
  forca: "#c9a46b",         // madeira da forca
  corda: "#d8c8a0",
  boneco: "#f5f5f5",
  texto: "#EDEDED",         // --color-text
  acerto: "#81B64C",        // --color-primary (letra certa, "Voce ganhou!")
  // Mesmo matiz do --color-danger (#E05252), so mais claro: o #E05252 da
  // 4.3:1 sobre o palco, e no celular o canvas encolhe e o texto fica pequeno.
  // Este da 4.9:1.
  erro: "#E36363",
  fraco: "#9A9A9A",         // --color-text-muted (textos de apoio)
  agua: "#2B6CB0",          // --color-water (lago)
  aguaClara: "#8fc1ef",     // ondas, respingos e gotas de suor
  margem: "#4a3b2a",        // terra da margem do lago
  grama: "#81B64C",         // --color-primary (o verde principal na grama)
  osso: "#9A9A9A",          // --color-text-muted; osso no lugar da parte comida
  piranha: "#8B3FD9",       // --color-piranha
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
