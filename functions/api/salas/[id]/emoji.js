// POST /api/salas/:id/emoji   corpo: { emoji }
//
// Reacao rapida entre os jogadores. Lista fechada: o servidor so aceita os
// emojis que estao em EMOJIS_PERMITIDOS, entao nao existe chat livre para
// virar vetor de abuso. O limite de frequencia evita que a tabela cresca sem
// controle com um botao segurado.

import { usuarioDaRequisicao } from '../../../_lib/sessao.js';
import { carregarSala, carregarMembros, membroDe, EMOJIS_PERMITIDOS } from '../../../_lib/salas.js';

export async function onRequestPost({ request, env, params }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado.' }, { status: 401 });
  }

  const salaId = Number(params.id);
  if (!Number.isInteger(salaId) || salaId <= 0) {
    return Response.json({ erro: 'Sala invalida.' }, { status: 400 });
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'Corpo invalido.' }, { status: 400 });
  }

  const emoji = String(corpo?.emoji ?? '').trim();
  if (!EMOJIS_PERMITIDOS.has(emoji)) {
    return Response.json({ erro: 'Reacao invalida.' }, { status: 400 });
  }

  const sala = await carregarSala(env, salaId);
  if (!sala) return Response.json({ erro: 'Sala nao encontrada.' }, { status: 404 });

  const membros = await carregarMembros(env, salaId);
  if (!membroDe(membros, usuarioId)) {
    return Response.json({ erro: 'Voce nao esta nesta sala.' }, { status: 403 });
  }
  if (sala.situacao === 'cancelada') {
    return Response.json({ erro: 'A sala foi cancelada.' }, { status: 409 });
  }

  const { total } = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM sala_eventos
    WHERE sala_id = ? AND usuario_id = ? AND criado_em > unixepoch() - 30
  `).bind(salaId, usuarioId).first();

  if (total >= 8) {
    return Response.json({ erro: 'Calma, muitas reacoes em pouco tempo.' }, { status: 429 });
  }

  await env.DB.prepare(`
    INSERT INTO sala_eventos (sala_id, usuario_id, conteudo)
    VALUES (?, ?, ?)
  `).bind(salaId, usuarioId, emoji).run();

  return Response.json({ ok: true });
}
