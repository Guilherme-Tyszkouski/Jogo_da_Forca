// GET /api/auth/login
//
// Monta a URL de autorizacao do Google e redireciona o navegador para la.
// Nenhum segredo aparece aqui: a URL leva so o client_id, que e publico.

import { montarCookie } from '../../_lib/sessao.js';

const AUTORIZACAO = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function onRequestGet({ request, env }) {
  const origem = new URL(request.url).origin;

  // O state protege contra CSRF no fluxo de login: o valor vai para o Google
  // e tambem para um cookie curto. No retorno, os dois tem que bater. Sem
  // isso, um site hostil consegue induzir o seu navegador a completar um
  // login com a conta DELE, e voce joga achando que e a sua.
  const state = crypto.randomUUID();

  const parametros = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origem}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${AUTORIZACAO}?${parametros}`,
      // Dez minutos: tempo de sobra para escolher a conta, curto o bastante
      // para o valor nao ficar valido pendurado no navegador.
      'Set-Cookie': montarCookie('oauth_state', state, 600)
    }
  });
}
