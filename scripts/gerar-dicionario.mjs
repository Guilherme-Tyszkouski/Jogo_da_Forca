// Gera o dicionario do Jogo da Forca.
//
// Divisao de responsabilidade entre as duas fontes:
//
//   LISTA DE FREQUENCIA (legendas de filmes, ~848 mil linhas, "palavra contagem")
//     - define QUAIS palavras entram: as mais usadas do idioma;
//     - define COMO se escrevem: a variante mais frequente vence.
//
//   DICIONARIO (~320 mil palavras validas)
//     - serve APENAS para dizer se a palavra existe, comparando a forma sem
//       acento. Nunca fornece a grafia.
//
// Por que a grafia vem do corpus e nao do dicionario: o dicionario contem
// entradas raras que colidem com palavras comuns quando o acento e removido
// (DISSE e DISSE-com-circunflexo viram a mesma chave). Escolher pelo dicionario
// deixa a entrada rara ganhar. Escolher pela contagem do corpus resolve com
// dado: a forma que as pessoas escrevem aos milhares vence a que ninguem usa.
//
// Uso:  node scripts/gerar-dicionario.mjs
// Saida: migrations/0002_carrega_dicionario.sql

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const TAMANHO_MINIMO = 5;
const TAMANHO_MAXIMO = 12;
const QUANTIDADE = 3000;

const FONTES_FREQUENCIA = [
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_full.txt',
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/pt_br/pt_br_full.txt'
];

const FONTES_DICIONARIO = [
  'https://raw.githubusercontent.com/pythonprobr/palavras/master/palavras.txt',
  'https://raw.githubusercontent.com/fserb/pt-br/master/palavras'
];

const SUFIXOS_VERBAIS = new RegExp(
  '(' + [
    'AVAMOS', 'IAMOS', 'ASSEMOS', 'ESSEMOS', 'ISSEMOS',
    'ARIAMOS', 'ERIAMOS', 'IRIAMOS',
    'ASSEM', 'ESSEM', 'ISSEM', 'ASSES', 'ISSES',
    'ARMOS', 'ERMOS', 'IRMOS', 'AREMOS', 'EREMOS', 'IREMOS',
    'ARDES', 'ERDES', 'IRDES',
    'ARAM', 'ERAM', 'IRAM', 'ARAO', 'ERAO', 'IRAO',
    'AVAM', 'AVAS', 'AVEIS', 'ASTES', 'ISTES',
    'ANDO', 'ENDO', 'INDO'
  ].join('|') + ')$'
);

const semAcento = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

async function baixar(rotulo, urls) {
  for (const url of urls) {
    try {
      process.stdout.write(`${rotulo}: ${url.split('/').slice(-1)[0]} ... `);
      const resposta = await fetch(url);
      if (!resposta.ok) { console.log(`HTTP ${resposta.status}`); continue; }
      const texto = await resposta.text();
      console.log(`ok, ${texto.split('\n').length} linhas`);
      return { url, texto };
    } catch (erro) {
      console.log(`falhou (${erro.message})`);
    }
  }
  throw new Error(`Nenhuma fonte de ${rotulo} respondeu.`);
}

// Varre o corpus inteiro e guarda, para cada forma sem acento, a grafia com a
// maior contagem e a soma das contagens de todas as variantes.
function analisarCorpus(texto) {
  const melhor = new Map();

  for (const linha of texto.split(/\r?\n/)) {
    const partes = linha.trim().split(/\s+/);
    if (partes.length < 2) continue;

    const grafia = partes[0].toUpperCase();
    const contagem = Number(partes[1]);
    if (!Number.isFinite(contagem)) continue;

    const chave = semAcento(grafia);
    if (!/^[A-Z]+$/.test(chave)) continue;
    if (chave.length < TAMANHO_MINIMO || chave.length > TAMANHO_MAXIMO) continue;

    const atual = melhor.get(chave);
    if (!atual) {
      melhor.set(chave, { grafia, contagem, total: contagem });
    } else {
      atual.total += contagem;
      if (contagem > atual.contagem) {
        atual.grafia = grafia;
        atual.contagem = contagem;
      }
    }
  }

  return melhor;
}

// Do dicionario so interessa o conjunto de formas sem acento que existem.
function chavesDoDicionario(texto) {
  const chaves = new Set();
  for (const linha of texto.split(/\r?\n/)) {
    const palavra = linha.trim().toUpperCase();
    if (!palavra || !/^[A-ZÀ-ÖØ-Þ]+$/.test(palavra)) continue;
    const chave = semAcento(palavra);
    if (/^[A-Z]+$/.test(chave)) chaves.add(chave);
  }
  return chaves;
}

const escaparSql = v => v.replace(/'/g, "''");

function gerarMigration(palavras, fonteFreq, fonteDic) {
  const linhas = [
    '-- Dicionario do Jogo da Forca.',
    '-- Gerado por scripts/gerar-dicionario.mjs.',
    `--   quais palavras e grafia: ${fonteFreq}`,
    `--   validacao de existencia: ${fonteDic}`,
    `-- ${palavras.length} palavras de ${TAMANHO_MINIMO} a ${TAMANHO_MAXIMO} letras.`,
    '-- Nao edite este arquivo na mao: rode o script de novo.',
    '',
    'DELETE FROM palavras;',
    ''
  ];

  const LOTE = 200;
  for (let i = 0; i < palavras.length; i += LOTE) {
    const valores = palavras.slice(i, i + LOTE)
      .map(p => `('${escaparSql(p.palavra)}', '${escaparSql(p.chave)}', ${p.chave.length})`)
      .join(',\n  ');
    linhas.push(`INSERT INTO palavras (palavra, normalizada, tamanho) VALUES\n  ${valores};`);
    linhas.push('');
  }
  return linhas.join('\n');
}

console.log('gerar-dicionario v5 — corpus define a grafia, dicionario so valida\n');

const frequencia = await baixar('frequencia', FONTES_FREQUENCIA);
const dicionario = await baixar('dicionario', FONTES_DICIONARIO);

const corpus = analisarCorpus(frequencia.texto);
const valida = chavesDoDicionario(dicionario.texto);

// Ordena por uso total, da palavra mais falada para a menos.
const candidatas = [...corpus.entries()]
  .map(([chave, dados]) => ({ chave, palavra: dados.grafia, total: dados.total }))
  .sort((a, b) => b.total - a.total);

const escolhidas = [];
const descartes = { foraDoDicionario: 0, verbo: 0 };

for (const candidata of candidatas) {
  if (escolhidas.length >= QUANTIDADE) break;
  if (!valida.has(candidata.chave)) { descartes.foraDoDicionario++; continue; }
  if (SUFIXOS_VERBAIS.test(candidata.chave)) { descartes.verbo++; continue; }
  escolhidas.push(candidata);
}

mkdirSync(join(RAIZ, 'migrations'), { recursive: true });
writeFileSync(
  join(RAIZ, 'migrations', '0002_carrega_dicionario.sql'),
  gerarMigration(escolhidas, frequencia.url, dicionario.url),
  'utf8'
);

console.log(`\nFormas distintas no corpus (5-12 letras): ${corpus.size}`);
console.log(`Descartadas por nao existirem no dicionario: ${descartes.foraDoDicionario}`);
console.log(`Descartadas por serem conjugacao verbal:     ${descartes.verbo}`);
console.log(`\n${escolhidas.length} palavras gravadas em migrations/0002_carrega_dicionario.sql\n`);

const porTamanho = {};
for (const p of escolhidas) porTamanho[p.chave.length] = (porTamanho[p.chave.length] || 0) + 1;
console.log('Quantidade por tamanho:');
for (let t = TAMANHO_MINIMO; t <= TAMANHO_MAXIMO; t++) {
  console.log(`  ${String(t).padStart(2)} letras: ${porTamanho[t] || 0}`);
}

// Conferencia dirigida: palavras comuns cuja grafia costuma sair errada.
console.log('\nConferencia de grafia:');
for (const alvo of ['DISSE', 'VOCE', 'ENTAO', 'PORQUE', 'TAMBEM', 'NINGUEM', 'ALGUEM']) {
  const achada = escolhidas.find(p => p.chave === alvo);
  console.log(`  ${alvo.padEnd(8)} -> ${achada ? achada.palavra : '(fora da lista)'}`);
}

console.log('\nAmostra:');
console.log('  primeiras 12:', escolhidas.slice(0, 12).map(p => p.palavra).join(', '));
console.log('  ultimas 12:  ', escolhidas.slice(-12).map(p => p.palavra).join(', '));
