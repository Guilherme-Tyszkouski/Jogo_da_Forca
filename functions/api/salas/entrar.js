// POST /api/salas/entrar   corpo: { codigo }
//
// Entra numa sala de espera. A vaga do segundo jogador e reservada com um
// UPDATE condicional: se duas pessoas clicarem no mesmo link no mesmo
// instante, so uma consegue, e a outra recebe "sala ja esta cheia".
//
// Quem ja e membro pode chamar de novo sem efeito (recarregar a pagina usa
// este mesmo caminho).

import { usuarioDaRequisicao } from '../../_lib/sessao.js';
import { carregarSalaPorCodigo, carregarMembros, membroDe } from '../../_lib/salas.js';

export async function onRequestPost({ request, env }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado para entrar numa sala.' }, { status: 401 });
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'Corpo invalido.' }, { status: 400 });
  }

  const codigo = String(corpo?.codigo ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(codigo)) {
    return Response.json({ erro: 'Codigo invalido.' }, { status: 400 });
  }

  const sala = await carregarSalaPorCodigo(env, codigo);
  if (!sala) {
    return Response.json({ erro: 'Sala nao encontrada.' }, { status: 404 });
  }

  const membros = await carregarMembros(env, sala.id);
  if (membroDe(membros, usuarioId)) {
    return Response.json({ id: sala.id, codigo: sala.codigo, situacao: sala.situacao });
  }

  if (sala.situacao === 'encerrada' || sala.situacao === 'cancelada') {
    return Response.json({ erro: 'Esta sala ja foi encerrada.' }, { status: 410 });
  }

  if (sala.situacao !== 'aguardando' || sala.convidado_id) {
    return Response.json({ erro: 'Esta sala ja esta cheia.' }, { status: 409 });
  }

  const reserva = await env.DB.prepare(`
    UPDATE salas
    SET convidado_id = ?, situacao = 'jogando', iniciada_em = unixepoch()
    WHERE id = ? AND situacao = 'aguardando' AND convidado_id IS NULL
  `).bind(usuarioId, sala.id).run();

  if (reserva.meta.changes !== 1) {
    return Response.json({ erro: 'Esta sala ja esta cheia.' }, { status: 409 });
  }

  await env.DB.prepare(`
    INSERT OR IGNORE INTO sala_jogadores (sala_id, usuario_id)
    VALUES (?, ?)
  `).bind(sala.id, usuarioId).run();

  return Response.json({ id: sala.id, codigo: sala.codigo, situacao: 'jogando' });
}
