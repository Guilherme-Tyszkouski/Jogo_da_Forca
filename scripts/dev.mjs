// Arranque do servidor de desenvolvimento.
//
// Os segredos NAO ficam em arquivo dentro do projeto. Eles vem das variaveis de
// ambiente do Windows (Configuracoes -> Variaveis de Ambiente -> Novo), ou do
// ambiente do shell em qualquer outro sistema.
//
// Por que isso e melhor que o .dev.vars:
//   - o segredo nao mora no repositorio, entao nao ha o que o .gitignore possa
//     falhar em proteger;
//   - o segredo nao mora na pasta do projeto, entao nao e sincronizado junto
//     se a pasta estiver no OneDrive, Dropbox ou Google Drive;
//   - um agente de IA com acesso aos arquivos do projeto nao alcanca o valor.
//
// Uso:  npm run dev

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

// Nomes dos segredos que o servidor precisa. O GOOGLE_CLIENT_ID nao entra aqui:
// ele e publico e vive no wrangler.toml.
const SEGREDOS = ['GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'];

const faltando = SEGREDOS.filter(nome => !process.env[nome]);

if (faltando.length) {
  console.error('\nFaltam variaveis de ambiente:\n');
  for (const nome of faltando) console.error(`  ${nome}`);
  console.error(`
No Windows:
  tecla Windows -> digite "variaveis de ambiente"
  -> "Editar as variaveis de ambiente do sistema"
  -> botao "Variaveis de Ambiente..."
  -> em "Variaveis de usuario", clique em "Novo..."
  -> Nome da variavel: o nome acima
  -> Valor da variavel: o valor (o Client Secret vem do Google Cloud Console)

Depois de criar, FECHE E ABRA O TERMINAL de novo. Terminal aberto nao enxerga
variavel criada depois dele.

Para gerar um SESSION_SECRET novo, se precisar:
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
`);
  process.exit(1);
}

// Aviso util: se o .dev.vars ainda existir, o wrangler le ele TAMBEM, e o valor
// de la pode mascarar um erro na variavel de ambiente.
if (existsSync(join(RAIZ, '.dev.vars'))) {
  console.warn(
    '\nAVISO: .dev.vars ainda existe. Agora que os segredos vem do ambiente,\n' +
    'ele e redundante e pode conter um valor antigo. Apague com: rm .dev.vars\n'
  );
}

const binario = join(RAIZ, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(binario)) {
  console.error('Nao achei o wrangler em node_modules. Rode: npm install');
  process.exit(1);
}

// --binding NOME=VALOR por segredo. Vale saber: o valor aparece na linha de
// comando deste processo, visivel para quem ja estiver logado nesta maquina.
// Para desenvolvimento local isso e aceitavel. Se um dia incomodar, o wrangler
// aceita --env-file apontando para um arquivo .env FORA do repositorio.
const argumentos = [binario, 'pages', 'dev'];
for (const nome of SEGREDOS) {
  argumentos.push('--binding', `${nome}=${process.env[nome]}`);
}

console.log(`Segredos carregados do ambiente: ${SEGREDOS.join(', ')}\n`);

// Chama o wrangler.js direto pelo Node: no Windows o npx e um .cmd, e o Node 20+
// bloqueia executar .cmd sem shell (EINVAL).
const filho = spawn(process.execPath, argumentos, { stdio: 'inherit' });
filho.on('close', codigo => process.exit(codigo ?? 0));
filho.on('error', erro => {
  console.error('Falha ao iniciar o wrangler:', erro.message);
  process.exit(1);
});
