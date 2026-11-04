// Configura os segredos do projeto sem que nenhum valor apareca na tela,
// no chat ou no repositorio.
//
// O que ele faz:
//   1. cria .dev.vars a partir de .dev.vars.example, se ainda nao existir;
//   2. GERA sozinho o SESSION_SECRET com crypto, porque chave de assinatura de
//      sessao nao precisa vir de lugar nenhum — precisa so ser aleatoria;
//   3. valida o formato do que voce colou, sem imprimir o conteudo;
//   4. envia os segredos para o Cloudflare por stdin, de modo que o valor nunca
//      vira argumento de linha de comando (argumento fica no historico do shell
//      e na lista de processos; stdin nao).
//
// Uso:  node scripts/configurar-segredos.mjs            -> so valida local
//       node scripts/configurar-segredos.mjs --enviar   -> envia ao Cloudflare

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAMINHO = join(RAIZ, '.dev.vars');
const MODELO = join(RAIZ, '.dev.vars.example');
const ENVIAR = process.argv.includes('--enviar');

// Segredos de verdade: nunca entram no repositorio.
const SEGREDOS = ['GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'];

// Valores publicos: ficam no wrangler.toml, repetidos aqui so para o dev local.
const PUBLICOS = ['GOOGLE_CLIENT_ID'];

function lerArquivo() {
  if (!existsSync(CAMINHO)) return {};
  const mapa = {};
  for (const linha of readFileSync(CAMINHO, 'utf8').split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const corte = limpa.indexOf('=');
    if (corte < 0) continue;
    mapa[limpa.slice(0, corte).trim()] = limpa.slice(corte + 1).trim().replace(/^["']|["']$/g, '');
  }
  return mapa;
}

function nomeDoProjeto() {
  const toml = readFileSync(join(RAIZ, 'wrangler.toml'), 'utf8');
  const achado = toml.match(/^\s*name\s*=\s*"([^"]+)"/m);
  if (!achado) throw new Error('Nao achei o campo name no wrangler.toml.');
  return achado[1];
}

// Envia um segredo pelo stdin do wrangler. O valor nunca aparece como argumento.
//
// Chama o wrangler pelo proprio Node, apontando para o arquivo .js dentro de
// node_modules, em vez de passar pelo npx. No Windows o npx e um arquivo .cmd,
// e desde o Node 20 executar .cmd sem shell e bloqueado por seguranca — da
// EINVAL. Ligar o shell resolveria, mas ai os argumentos passam pelo cmd e
// ganham regras de aspas. Chamar o .js direto evita os dois problemas.
function enviarSegredo(nome, valor, projeto) {
  return new Promise((resolve, reject) => {
    const binarioLocal = join(RAIZ, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
    if (!existsSync(binarioLocal)) {
      reject(new Error(
        'Nao achei o wrangler em node_modules. Rode: npm install -D wrangler'
      ));
      return;
    }
    const filho = spawn(
      process.execPath,
      [binarioLocal, 'pages', 'secret', 'put', nome, '--project-name', projeto],
      { stdio: ['pipe', 'inherit', 'inherit'] }
    );
    filho.stdin.write(valor);
    filho.stdin.end();
    filho.on('close', codigo => codigo === 0
      ? resolve()
      : reject(new Error(`wrangler saiu com codigo ${codigo} ao enviar ${nome}`)));
    filho.on('error', reject);
  });
}

// ---------------------------------------------------------------- execucao

if (!existsSync(CAMINHO)) {
  if (!existsSync(MODELO)) {
    console.error('Falta .dev.vars.example para servir de modelo.');
    process.exit(1);
  }
  writeFileSync(CAMINHO, readFileSync(MODELO, 'utf8'), 'utf8');
  console.log('.dev.vars criado a partir do modelo.');
  console.log('Abra o arquivo e cole o Client ID e o Client Secret do Google.\n');
}

let valores = lerArquivo();

// A chave de sessao e gerada aqui, nao copiada de lugar nenhum. 32 bytes de
// aleatoriedade criptografica em base64url.
if (!valores.SESSION_SECRET || valores.SESSION_SECRET === 'PREENCHER') {
  const chave = randomBytes(32).toString('base64url');
  appendFileSync(CAMINHO, `\nSESSION_SECRET=${chave}\n`, 'utf8');
  valores = lerArquivo();
  console.log('SESSION_SECRET gerado (32 bytes aleatorios) e gravado em .dev.vars.');
  console.log('O valor nao sera impresso em lugar nenhum.\n');
}

// Validacao de formato. Confere o formato, nunca mostra o conteudo.
const problemas = [];

for (const nome of [...PUBLICOS, ...SEGREDOS]) {
  const valor = valores[nome];
  if (!valor || valor === 'PREENCHER') {
    problemas.push(`${nome}: ainda nao preenchido em .dev.vars`);
    continue;
  }
  if (nome === 'GOOGLE_CLIENT_ID' && !valor.endsWith('.apps.googleusercontent.com')) {
    problemas.push(`${nome}: deveria terminar em .apps.googleusercontent.com`);
  }
  if (nome === 'GOOGLE_CLIENT_SECRET' && valor.length < 20) {
    problemas.push(`${nome}: curto demais (${valor.length} caracteres), parece incompleto`);
  }
  if (/\s/.test(valor)) {
    problemas.push(`${nome}: contem espaco ou quebra de linha — provavel erro de colagem`);
  }
}

console.log('Conferencia (sem exibir valores):');
for (const nome of [...PUBLICOS, ...SEGREDOS]) {
  const valor = valores[nome];
  const estado = !valor || valor === 'PREENCHER' ? 'FALTANDO' : `ok, ${valor.length} caracteres`;
  console.log(`  ${nome.padEnd(22)} ${estado}`);
}

if (problemas.length) {
  console.error('\nProblemas encontrados:');
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('\nTudo preenchido e com formato plausivel.');

if (!ENVIAR) {
  console.log('Rode com --enviar para mandar os segredos ao Cloudflare.');
  process.exit(0);
}

const projeto = nomeDoProjeto();
console.log(`\nEnviando segredos para o projeto Pages "${projeto}"...\n`);

for (const nome of SEGREDOS) {
  await enviarSegredo(nome, valores[nome], projeto);
  console.log(`  ${nome} enviado.`);
}

console.log('\nPronto. Confira a lista de nomes (sem valores) com:');
console.log(`  npx wrangler pages secret list --project-name ${projeto}`);
