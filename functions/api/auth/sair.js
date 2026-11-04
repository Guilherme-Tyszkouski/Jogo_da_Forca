// POST /api/auth/sair
//
// Apaga o cookie de sessao. E POST, nao GET, de proposito: um link ou uma
// imagem num site hostil conseguiria disparar um GET e deslogar voce sem
// querer. Com POST e SameSite=Lax, isso nao acontece.

import { montarCookie, NOME_COOKIE } from '../../_lib/sessao.js';

export async function onRequestPost() {
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': montarCookie(NOME_COOKIE, '', 0) }
  });
}
