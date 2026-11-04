// GET /api/auth/eu
//
// Diz quem esta logado. O front-end chama isso ao abrir a pagina para decidir
// se mostra "Entrar" ou o nome do jogador.

import { usuarioDaRequisicao } from '../../_lib/sessao.js';

export async function onRequestGet({ request, env }) {
  const usuarioId = await usuarioDaRequisicao(request, env);

  if (!usuarioId) {
    return Response.json({ autenticado: false });
  }

  const usuario = await env.DB
    .prepare('SELECT id, nome, email FROM usuarios WHERE id = ?')
    .bind(usuarioId)
    .first();

  // Sessao assinada valida, mas usuario sumiu do banco: trata como deslogado.
  if (!usuario) return Response.json({ autenticado: false });

  return Response.json({
    autenticado: true,
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email
  });
}
