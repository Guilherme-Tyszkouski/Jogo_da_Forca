// Sessao assinada em cookie.
//
// Nao guardamos sessao em tabela: o proprio cookie carrega o id do usuario e a
// validade, com uma assinatura HMAC por cima. Quem nao tem o SESSION_SECRET nao
// consegue forjar um cookie valido, e quem edita o cookie invalida a assinatura.
//
// O cookie NAO e segredo e nao e criptografado — qualquer um le o conteudo
// dele. Por isso so entra ali o que pode ser publico: id do usuario e validade.

const CODIFICADOR = new TextEncoder();
const NOME_COOKIE = 'sessao';
const DURACAO_SEGUNDOS = 60 * 60 * 24 * 7; // sete dias

function paraBase64Url(bytes) {
  let texto = '';
  for (const byte of new Uint8Array(bytes)) texto += String.fromCharCode(byte);
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto) {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(normal.padEnd(Math.ceil(normal.length / 4) * 4, '='));
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

async function chaveHmac(segredo) {
  return crypto.subtle.importKey(
    'raw',
    CODIFICADOR.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function criarSessao(usuarioId, segredo) {
  const conteudo = paraBase64Url(
    CODIFICADOR.encode(JSON.stringify({
      uid: usuarioId,
      exp: Math.floor(Date.now() / 1000) + DURACAO_SEGUNDOS
    }))
  );
  const assinatura = paraBase64Url(
    await crypto.subtle.sign('HMAC', await chaveHmac(segredo), CODIFICADOR.encode(conteudo))
  );
  return `${conteudo}.${assinatura}`;
}

export async function lerSessao(valor, segredo) {
  if (!valor || !valor.includes('.')) return null;
  const [conteudo, assinatura] = valor.split('.');

  // crypto.subtle.verify compara em tempo constante, o que evita que o atacante
  // descubra a assinatura byte a byte medindo o tempo de resposta.
  const valida = await crypto.subtle.verify(
    'HMAC',
    await chaveHmac(segredo),
    deBase64Url(assinatura),
    CODIFICADOR.encode(conteudo)
  ).catch(() => false);
  if (!valida) return null;

  try {
    const dados = JSON.parse(new TextDecoder().decode(deBase64Url(conteudo)));
    if (!dados.uid || !dados.exp) return null;
    if (dados.exp < Math.floor(Date.now() / 1000)) return null;
    return dados.uid;
  } catch {
    return null;
  }
}

export function montarCookie(nome, valor, maxIdade) {
  const partes = [
    `${nome}=${valor}`,
    'Path=/',
    'HttpOnly',               // JavaScript da pagina nao consegue ler
    'Secure',                 // so trafega em HTTPS
    'SameSite=Lax',           // nao acompanha requisicao vinda de outro site
    `Max-Age=${maxIdade}`
  ];
  return partes.join('; ');
}

export function lerCookie(requisicao, nome) {
  const cabecalho = requisicao.headers.get('Cookie') || '';
  for (const parte of cabecalho.split(';')) {
    const corte = parte.indexOf('=');
    if (corte < 0) continue;
    if (parte.slice(0, corte).trim() === nome) return parte.slice(corte + 1).trim();
  }
  return null;
}

// Usado por todo endpoint protegido. A identidade vem SEMPRE daqui, nunca de
// um campo que o cliente mandou no corpo ou na query.
export async function usuarioDaRequisicao(requisicao, env) {
  return lerSessao(lerCookie(requisicao, NOME_COOKIE), env.SESSION_SECRET);
}

export { NOME_COOKIE, DURACAO_SEGUNDOS };
