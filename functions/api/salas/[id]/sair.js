// POST /api/salas/:id/sair
//
// Dois significados, decididos pelo estado da sala:
//   - aguardando  -> o criador cancela a sala (ninguem chega a jogar);
//   - jogando     -> o jogador desiste e o outro vence por desistencia.
//
// O registro fica no banco em vez de ser apagado: historico de sala cancelada
// nao vira "sala fantasma" na lista de salas abertas (que filtra por estado).

import { usuarioDaRequisicao } from '../../../_lib/sessao.js';
import { carregarSala, carregarMembros, membroDe } from '../../../_lib/salas.js';

export async function onRequestPost({ request, env, params }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado.' }, { status: 401 });
  }

  const salaId = Number(params.id);
  if (!Number.isInteger(salaId) || salaId <= 0) {
    return Response.json({ erro: 'Sala invalida.' }, { status: 400 });
  }

  const sala = await carregarSala(env, salaId);
  if (!sala) return Response.json({ erro: 'Sala nao encontrada.' }, { status: 404 });

  const membros = await carregarMembros(env, salaId);
  const eu = membroDe(membros, usuarioId);
  if (!eu) return Response.json({ erro: 'Voce nao esta nesta sala.' }, { status: 403 });

  if (sala.situacao === 'aguardando') {
    if (sala.criador_id !== usuarioId) {
      return Response.json({ erro: 'Somente quem criou a sala pode cancelar.' }, { status: 403 });
    }
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE salas
        SET situacao = 'cancelada', motivo = 'cancelada', encerrada_em = unixepoch()
        WHERE id = ? AND situacao = 'aguardando'
      `).bind(salaId),
      env.DB.prepare(`
        UPDATE sala_jogadores
        SET situacao = 'desistiu', terminada_em = unixepoch()
        WHERE sala_id = ? AND usuario_id = ?
      `).bind(salaId, usuarioId)
    ]);
    return Response.json({ ok: true, situacao: 'cancelada' });
  }

  if (sala.situacao === 'jogando') {
    const adversario = membros.find(m => m.usuario_id !== usuarioId) || null;
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE sala_jogadores
        SET situacao = 'desistiu', terminada_em = unixepoch()
        WHERE sala_id = ? AND usuario_id = ? AND situacao = 'jogando'
      `).bind(salaId, usuarioId),
      env.DB.prepare(`
        UPDATE salas
        SET situacao = 'encerrada', vencedor_id = ?, motivo = 'desistencia', encerrada_em = unixepoch()
        WHERE id = ? AND situacao = 'jogando'
      `).bind(adversario?.usuario_id ?? null, salaId)
    ]);
    return Response.json({ ok: true, situacao: 'encerrada' });
  }

  return Response.json({ ok: true, situacao: sala.situacao });
}
