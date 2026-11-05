// Envia os segredos para o Cloudflare, lendo das variaveis de ambiente.
//
// Nao existe mais arquivo de segredos no projeto. A mesma fonte que o
// `npm run dev` usa e a que este script usa, entao nao ha dois lugares para
// desencontrar valor.
//
// Uso:  node scripts/configurar-segredos.mjs            -> so valida
//       node scripts/configurar-segredos.mjs --enviar   -> envia ao Cloudflare

import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENVIAR = process.argv.includes('--enviar');

const SEGREDOS = ['GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'];

function nomeDoProjeto() {
  const toml = readFileSync(join(RAIZ, 'wrangler.toml'), 'utf8');
  const achado = toml.match(/^\s*name\s*=\s*"([^"]+)"/m);
  if (!achado) throw new Error('Nao achei o campo name no wrangler.toml.');
  return achado[1];
}

// Envia pelo stdin. O valor nunca vira argumento de linha de comando, que
// ficaria no historico do shell e na lista de processos.
function enviarSegredo(nome, valor, projeto) {
  return new Promise((resolve, reject) => {
    const binario = join(RAIZ, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
    if (!existsSync(binario)) {
      reject(new Error('Nao achei o wrangler em node_modules. Rode: npm install'));
      return;
    }
    // Chama o wrangler.js pelo Node: no Windows o npx e um .cmd, e o Node 20+
    // bloqueia executar .cmd sem shell (EINVAL).
    const filho = spawn(
      process.execPath,
      [binario, 'pages', 'secret', 'put', nome, '--project-name', projeto],
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

const problemas = [];

console.log('Conferencia (sem exibir valores):');
for (const nome of SEGREDOS) {
  const valor = process.env[nome];
  if (!valor) {
    console.log(`  ${nome.padEnd(22)} FALTANDO`);
    problemas.push(`${nome}: nao esta nas variaveis de ambiente`);
    continue;
  }
  if (/\s/.test(valor)) {
    problemas.push(`${nome}: contem espaco ou quebra de linha — provavel erro de colagem`);
  }
  if (nome === 'GOOGLE_CLIENT_SECRET' && valor.length < 20) {
    problemas.push(`${nome}: curto demais (${valor.length} caracteres), parece incompleto`);
  }
  console.log(`  ${nome.padEnd(22)} ok, ${valor.length} caracteres`);
}

if (problemas.length) {
  console.error('\nProblemas encontrados:');
  for (const p of problemas) console.error(`  - ${p}`);
  console.error(`
As variaveis sao de ambiente, nao de arquivo. No Windows:
  Windows + R -> sysdm.cpl -> aba Avancado -> Variaveis de Ambiente
  -> em "Variaveis de usuario" -> Novo...

Depois de criar, FECHE E ABRA o VS Code (nao so o terminal): o terminal
integrado herda o ambiente do VS Code, nao do Windows.
`);
  process.exit(1);
}

console.log('\nTudo preenchido e com formato plausivel.');

if (!ENVIAR) {
  console.log('Rode com --enviar para mandar os segredos ao Cloudflare.');
  process.exit(0);
}

const projeto = nomeDoProjeto();
console.log(`\nEnviando para o projeto Pages "${projeto}"...\n`);

for (const nome of SEGREDOS) {
  await enviarSegredo(nome, process.env[nome], projeto);
  console.log(`  ${nome} enviado.`);
}

console.log('\nPronto. Confira a lista de nomes (sem valores) com:');
console.log(`  npx wrangler pages secret list --project-name ${projeto}`);
