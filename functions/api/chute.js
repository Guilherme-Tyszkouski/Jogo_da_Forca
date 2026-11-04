// POST /api/chute   corpo: { partidaId, letra }
//
// O servidor decide tudo: se a letra existe, em quais posicoes, quantos erros
// ja foram e se a partida acabou. O cliente so desenha o resultado.
//
// A palavra completa so e devolvida quando a partida termina.

import { usuarioDaRequisicao } from '../_lib/sessao.js';

const MAX_ERROS = 6;

const semAcento = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function onRequestPost({ request, env }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado para jogar.' }, { status: 401 });
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'Corpo invalido.' }, { status: 400 });
  }

  const partidaId = Number(corpo?.partidaId);
  if (!Number.isInteger(partidaId) || partidaId <= 0) {
    return Response.json({ erro: 'partidaId invalido.' }, { status: 400 });
  }

  // Normaliza e valida a letra. Tudo que vem do cliente e suspeito: sem este
  // filtro, alguem manda uma string inteira e descobre varias letras de uma vez.
  const letra = semAcento(String(corpo?.letra ?? '').toUpperCase());
  if (!/^[A-Z]$/.test(letra)) {
    return Response.json({ erro: 'Envie uma unica letra de A a Z.' }, { status: 400 });
  }

  // O filtro por usuario_id e o que impede alguem de jogar na partida de outro
  // so por saber o numero dela.
  const partida = await env.DB.prepare(`
    SELECT p.id, p.erros, p.situacao, w.palavra, w.normalizada
    FROM partidas p
    JOIN palavras w ON w.id = p.palavra_id
    WHERE p.id = ? AND p.usuario_id = ?
  `).bind(partidaId, usuarioId).first();

  if (!partida) {
    return Response.json({ erro: 'Partida nao encontrada.' }, { status: 404 });
  }
  if (partida.situacao !== 'em_andamento') {
    return Response.json({ erro: 'Partida ja encerrada.' }, { status: 409 });
  }

  const jaChutadas = await env.DB
    .prepare('SELECT letra FROM jogadas WHERE partida_id = ?')
    .bind(partidaId)
    .all();
  const letras = new Set(jaChutadas.results.map(l => l.letra));

  if (letras.has(letra)) {
    return Response.json({ erro: 'Letra ja usada.' }, { status: 409 });
  }

  const posicoes = [];
  const normalizada = partida.normalizada;
  for (let i = 0; i < normalizada.length; i++) {
    if (normalizada[i] === letra) posicoes.push(i);
  }
  const acertou = posicoes.length > 0;

  letras.add(letra);
  const erros = partida.erros + (acertou ? 0 : 1);

  // Venceu quando toda letra distinta da palavra ja foi chutada.
  const distintas = new Set(normalizada.split(''));
  const venceu = [...distintas].every(l => letras.has(l));
  const perdeu = !venceu && erros >= MAX_ERROS;
  const situacao = venceu ? 'vitoria' : perdeu ? 'derrota' : 'em_andamento';

  // batch() envia tudo numa viagem so ao D1, e as duas escritas acompanham uma
  // a outra: a jogada nunca fica gravada sem o contador de erros subir junto.
  await env.DB.batch([
    env.DB.prepare('INSERT INTO jogadas (partida_id, letra, acertou) VALUES (?, ?, ?)')
      .bind(partidaId, letra, acertou ? 1 : 0),
    env.DB.prepare(`
      UPDATE partidas
      SET erros = ?, situacao = ?, terminada_em = CASE WHEN ? = 'em_andamento' THEN NULL ELSE unixepoch() END
      WHERE id = ?
    `).bind(erros, situacao, situacao, partidaId)
  ]);

  return Response.json({
    acertou,
    posicoes,
    erros,
    maxErros: MAX_ERROS,
    situacao,
    // A palavra so atravessa quando nao ha mais nada a adivinhar.
    palavra: situacao === 'em_andamento' ? null : partida.palavra
  });
}
