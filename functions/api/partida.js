// POST /api/partida
//
// Sorteia uma palavra e abre uma partida. O cliente recebe o id da partida e o
// TAMANHO da palavra. Nada mais. A palavra em si nunca sai daqui enquanto a
// partida estiver em andamento.

import { usuarioDaRequisicao } from '../_lib/sessao.js';

export const MAX_ERROS = 6;

export async function onRequestPost({ request, env }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado para jogar.' }, { status: 401 });
  }

  // ORDER BY RANDOM() varre a tabela inteira. Com 3000 linhas isso e
  // irrelevante; se o dicionario crescer muito, troca por sorteio de id.
  const palavra = await env.DB
    .prepare('SELECT id, tamanho FROM palavras ORDER BY RANDOM() LIMIT 1')
    .first();

  if (!palavra) {
    return Response.json({ erro: 'Dicionario vazio.' }, { status: 500 });
  }

  const criada = await env.DB.prepare(`
    INSERT INTO partidas (usuario_id, palavra_id)
    VALUES (?, ?)
    RETURNING id
  `).bind(usuarioId, palavra.id).first();

  return Response.json({
    partidaId: criada.id,
    tamanho: palavra.tamanho,
    maxErros: MAX_ERROS
  });
}
