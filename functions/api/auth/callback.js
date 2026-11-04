// GET /api/auth/callback
//
// O Google devolve o navegador para ca com um "code". Trocamos esse code por
// tokens falando direto com o Google, servidor para servidor. O client secret
// so existe nesta troca e nunca chega ao navegador.

import { criarSessao, montarCookie, lerCookie, NOME_COOKIE, DURACAO_SEGUNDOS }
  from '../../_lib/sessao.js';

const TOKEN = 'https://oauth2.googleapis.com/token';

function erro(mensagem, status = 400) {
  // Mensagem generica para o usuario. Detalhe de falha de autenticacao nao
  // deve virar pista para quem esta sondando o endpoint.
  return new Response(
    `<!doctype html><meta charset="utf-8"><p>${mensagem}</p><p><a href="/">Voltar</a></p>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// Le as declaracoes do id_token sem verificar assinatura.
//
// Isso e seguro AQUI e so aqui: o token acabou de chegar numa resposta HTTPS
// do proprio endpoint do Google, autenticada com o nosso client secret. Nao
// passou pelo navegador, entao nao houve oportunidade de troca. A propria
// documentacao do Google dispensa a verificacao de assinatura neste caso.
// Se algum dia o token vier do cliente, a assinatura passa a ser obrigatoria.
function lerIdToken(idToken) {
  const partes = idToken.split('.');
  if (partes.length !== 3) return null;
  const normal = partes[1].replace(/-/g, '+').replace(/_/g, '/');
  try {
    return JSON.parse(
      decodeURIComponent(
        atob(normal.padEnd(Math.ceil(normal.length / 4) * 4, '='))
          .split('')
          .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      )
    );
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  if (url.searchParams.get('error')) return erro('Login cancelado.');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return erro('Retorno incompleto do Google.');

  // Confere o state contra o cookie gravado no login.
  if (state !== lerCookie(request, 'oauth_state')) {
    return erro('Sessao de login invalida. Tente novamente.', 403);
  }

  const resposta = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: 'authorization_code'
    })
  });

  if (!resposta.ok) {
    // De proposito nao registramos o corpo da resposta: ele pode conter o
    // code e fragmentos de credencial.
    return erro('Nao foi possivel concluir o login.', 502);
  }

  const { id_token } = await resposta.json();
  const dados = lerIdToken(id_token);
  if (!dados) return erro('Resposta do Google ilegivel.', 502);

  // Validacao das declaracoes, mesmo vindo direto do Google.
  const agora = Math.floor(Date.now() / 1000);
  const emissorValido = dados.iss === 'accounts.google.com'
    || dados.iss === 'https://accounts.google.com';
  if (!emissorValido) return erro('Emissor do token inesperado.', 403);
  if (dados.aud !== env.GOOGLE_CLIENT_ID) return erro('Token emitido para outro aplicativo.', 403);
  if (!dados.exp || dados.exp < agora) return erro('Token expirado.', 403);
  if (!dados.sub) return erro('Token sem identificador de usuario.', 403);

  // Cria ou atualiza o usuario. A chave e (provedor, sub): o sub e o
  // identificador estavel do Google. Email nao serve de chave, porque a
  // pessoa pode trocar o email da conta.
  await env.DB.prepare(`
    INSERT INTO usuarios (provedor, sub, nome, email)
    VALUES ('google', ?, ?, ?)
    ON CONFLICT (provedor, sub) DO UPDATE SET nome = excluded.nome, email = excluded.email
  `).bind(dados.sub, dados.name ?? null, dados.email ?? null).run();

  const usuario = await env.DB
    .prepare('SELECT id FROM usuarios WHERE provedor = ? AND sub = ?')
    .bind('google', dados.sub)
    .first();

  if (!usuario) return erro('Nao foi possivel registrar o usuario.', 500);

  const sessao = await criarSessao(usuario.id, env.SESSION_SECRET);

  const cabecalhos = new Headers({ Location: '/' });
  cabecalhos.append('Set-Cookie', montarCookie(NOME_COOKIE, sessao, DURACAO_SEGUNDOS));
  cabecalhos.append('Set-Cookie', montarCookie('oauth_state', '', 0)); // apaga o state

  return new Response(null, { status: 302, headers: cabecalhos });
}
