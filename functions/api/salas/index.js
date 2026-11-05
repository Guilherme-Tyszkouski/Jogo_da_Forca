// GET  /api/salas  -> salas abertas (aguardando adversario)
// POST /api/salas  -> cria uma sala e devolve o codigo de convite
//
// A palavra e sorteada AQUI e nunca sai na resposta. Quem cria recebe apenas
// o codigo; o tamanho so aparece quando a partida comeca.

import { usuarioDaRequisicao } from '../../_lib/sessao.js';
import { gerarCodigo, sortearPalavra, nomeExibicao, faixaDeTamanho } from '../../_lib/salas.js';

export async function onRequestGet({ request, env }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado para ver as salas.' }, { status: 401 });
  }

  // Salas com mais de 30 minutos provavelmente foram abandonadas na espera.
  const { results } = await env.DB.prepare(`
    SELECT s.id, s.codigo, s.criada_em, s.max_erros,
           w.tamanho, u.nome, u.email
    FROM salas s
    JOIN usuarios u ON u.id = s.criador_id
    JOIN palavras w ON w.id = s.palavra_id
    WHERE s.situacao = 'aguardando'
      AND s.convidado_id IS NULL
      AND s.criador_id <> ?
      AND s.criada_em > unixepoch() - 1800
    ORDER BY s.criada_em DESC
    LIMIT 20
  `).bind(usuarioId).all();

  return Response.json({
    salas: results.map(s => ({
      id: s.id,
      codigo: s.codigo,
      tamanho: s.tamanho,
      maxErros: s.max_erros,
      criador: nomeExibicao(s),
      criadaEm: s.criada_em
    }))
  });
}

export async function onRequestPost({ request, env }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado para criar uma sala.' }, { status: 401 });
  }

  let corpo = {};
  try {
    corpo = await request.json();
  } catch {
    corpo = {};
  }

  const faixa = corpo?.tamanho;
  if (faixa !== undefined && faixa !== null && !faixaDeTamanho(faixa)) {
    return Response.json({ erro: 'Tamanho invalido.' }, { status: 400 });
  }

  const palavra = await sortearPalavra(env, faixaDeTamanho(faixa) ? faixa : null);
  if (!palavra) {
    return Response.json({ erro: 'Dicionario vazio.' }, { status: 500 });
  }

  // Colisao de codigo de 6 caracteres e rara, mas nao impossivel: tenta de
  // novo em vez de devolver erro para quem clicou em "criar".
  let sala = null;
  for (let tentativa = 0; tentativa < 8 && !sala; tentativa++) {
    const codigo = gerarCodigo();
    try {
      sala = await env.DB.prepare(`
        INSERT INTO salas (codigo, palavra_id, criador_id)
        VALUES (?, ?, ?)
        RETURNING id, codigo
      `).bind(codigo, palavra.id, usuarioId).first();
    } catch (erro) {
      if (!String(erro?.message ?? erro).includes('UNIQUE')) throw erro;
    }
  }

  if (!sala) {
    return Response.json({ erro: 'Nao foi possivel criar a sala. Tente de novo.' }, { status: 500 });
  }

  await env.DB.prepare(`
    INSERT INTO sala_jogadores (sala_id, usuario_id)
    VALUES (?, ?)
  `).bind(sala.id, usuarioId).run();

  return Response.json({ id: sala.id, codigo: sala.codigo }, { status: 201 });
}
