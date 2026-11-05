// GET /api/salas/:id/estado
//
// Retrato da sala para UM jogador. O cliente chama a cada segundo enquanto
// estiver na sala — e assim que o duelo fica "ao vivo". O rival aparece
// somente com contadores (erros e acertos), nunca com as letras que chutou.

import { usuarioDaRequisicao } from '../../../_lib/sessao.js';
import { estadoDaSala } from '../../../_lib/salas.js';

export async function onRequestGet({ request, env, params }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado.' }, { status: 401 });
  }

  const salaId = Number(params.id);
  if (!Number.isInteger(salaId) || salaId <= 0) {
    return Response.json({ erro: 'Sala invalida.' }, { status: 400 });
  }

  const estado = await estadoDaSala(env, salaId, usuarioId);
  if (!estado) {
    return Response.json({ erro: 'Sala nao encontrada.' }, { status: 404 });
  }

  return Response.json(estado);
}
