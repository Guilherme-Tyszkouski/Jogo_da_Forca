// Busca a definicao de cada palavra no Dicionario Aberto e gera a migration
// que preenche a coluna definicao.
//
// A cobertura e PARCIAL: o dicionario nao tem verbete para toda palavra. O
// script mede e informa quantas achou, em vez de supor.
//
// Cuidados tomados:
//   - a definicao e mascarada: se o texto repete a propria palavra, ela vira
//     "____", senao a dica entrega a resposta;
//   - requisicoes em lotes pequenos, para nao martelar um servico gratuito;
//   - o resultado e salvo em cache local, entao rodar de novo nao refaz tudo.
//
// Uso:  node scripts/buscar-definicoes.mjs
// Saida: migrations/0004_carrega_definicoes.sql

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = join(RAIZ, 'migrations', '0002_carrega_dicionario.sql');
const CACHE = join(RAIZ, '.cache', 'definicoes.json');
const DESTINO = join(RAIZ, 'migrations', '0004_carrega_definicoes.sql');

const API = 'https://api.dicionario-aberto.net/word/';
const SIMULTANEAS = 6;        // gentil com um servico gratuito
const TAMANHO_MAXIMO = 180;   // dica longa demais entrega o jogo

const semAcento = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Le as palavras direto da migration ja gerada, em vez de baixar de novo.
function lerPalavras() {
  if (!existsSync(ORIGEM)) {
    console.error('Rode antes: node scripts/gerar-dicionario.mjs');
    process.exit(1);
  }
  const texto = readFileSync(ORIGEM, 'utf8');
  const palavras = [];
  for (const linha of texto.split(/\r?\n/)) {
    const achado = linha.match(/^\s*\('([^']+)',\s*'([^']+)',\s*(\d+)\)/);
    if (achado) palavras.push({ palavra: achado[1], normalizada: achado[2] });
  }
  return palavras;
}

// A definicao vem como XML dentro de um campo JSON. Extrai o texto de <def>.
function extrairDefinicao(xml, palavra) {
  const bloco = xml.match(/<def>([\s\S]*?)<\/def>/);
  if (!bloco) return null;

  let texto = bloco[1]
    .replace(/<[^>]+>/g, ' ')      // tira marcacao interna
    .replace(/_([^_]*)_/g, '$1')   // o italico vem marcado com sublinhado
    .replace(/\s+/g, ' ')
    .trim();

  if (!texto) return null;

  // Mascara a propria palavra e a forma sem acento. Sem isso a definicao de
  // CASA comeca com "casa" e a dica entrega tudo.
  for (const alvo of new Set([palavra, semAcento(palavra)])) {
    texto = texto.replace(new RegExp(alvo, 'gi'), '____');
  }

  if (texto.length > TAMANHO_MAXIMO) {
    texto = texto.slice(0, TAMANHO_MAXIMO).replace(/\s+\S*$/, '') + '…';
  }

  return texto;
}

async function buscarUma(item) {
  // Tenta a grafia com acento; se nao houver verbete, tenta sem.
  for (const consulta of new Set([item.palavra.toLowerCase(), item.normalizada.toLowerCase()])) {
    try {
      const resposta = await fetch(API + encodeURIComponent(consulta));
      if (!resposta.ok) continue;
      const entradas = await resposta.json();
      if (!Array.isArray(entradas) || !entradas.length) continue;
      for (const entrada of entradas) {
        const definicao = extrairDefinicao(entrada.xml || '', item.palavra);
        if (definicao) return definicao;
      }
    } catch {
      // Rede instavel: trata como "nao achou" e segue.
    }
  }
  return null;
}

const palavras = lerPalavras();
console.log(`${palavras.length} palavras lidas de 0002_carrega_dicionario.sql\n`);

mkdirSync(dirname(CACHE), { recursive: true });
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const pendentes = palavras.filter(p => !(p.palavra in cache));

console.log(`${Object.keys(cache).length} ja estavam em cache, ${pendentes.length} a buscar.`);
console.log('Isso leva alguns minutos. Pode acompanhar o contador.\n');

for (let i = 0; i < pendentes.length; i += SIMULTANEAS) {
  const lote = pendentes.slice(i, i + SIMULTANEAS);
  const resultados = await Promise.all(lote.map(buscarUma));
  lote.forEach((item, indice) => { cache[item.palavra] = resultados[indice]; });

  if ((i / SIMULTANEAS) % 25 === 0 || i + SIMULTANEAS >= pendentes.length) {
    const feitas = Math.min(i + SIMULTANEAS, pendentes.length);
    const achadas = Object.values(cache).filter(Boolean).length;
    console.log(`  ${feitas}/${pendentes.length} buscadas — ${achadas} com definicao ate agora`);
    writeFileSync(CACHE, JSON.stringify(cache), 'utf8'); // salva o progresso
  }
}

writeFileSync(CACHE, JSON.stringify(cache), 'utf8');

const comDefinicao = palavras.filter(p => cache[p.palavra]);
const escaparSql = v => v.replace(/'/g, "''");

const linhas = [
  '-- Definicoes do Dicionario Aberto (CC BY-SA 2.5 Portugal).',
  '-- Fonte: https://dicionario-aberto.net/',
  `-- ${comDefinicao.length} de ${palavras.length} palavras tem verbete.`,
  '-- Gerado por scripts/buscar-definicoes.mjs. Nao edite na mao.',
  ''
];

for (const item of comDefinicao) {
  linhas.push(
    `UPDATE palavras SET definicao = '${escaparSql(cache[item.palavra])}' ` +
    `WHERE normalizada = '${escaparSql(item.normalizada)}';`
  );
}

writeFileSync(DESTINO, linhas.join('\n') + '\n', 'utf8');

const porcentagem = ((comDefinicao.length / palavras.length) * 100).toFixed(1);
console.log(`\n${comDefinicao.length} de ${palavras.length} palavras tem definicao (${porcentagem}%).`);
console.log(`Gravado em migrations/0004_carrega_definicoes.sql`);
console.log('\nExemplos do que foi encontrado:');
for (const item of comDefinicao.slice(0, 5)) {
  console.log(`  ${item.palavra}: ${cache[item.palavra]}`);
}
