// POST /api/salas/:id/chute   corpo: { letra }
//
// Mesma logica do jogo solo, com duas diferencas:
//   - o estado e por jogador dentro da sala;
//   - o fim da sala pode ser decidido pelo outro jogador (vitoria dele) ou
//     pela comparacao quando os dois estouram os erros.
//
// A resposta e o estado completo da sala, para o cliente nao precisar de uma
// segunda requisicao logo depois de jogar.

import { usuarioDaRequisicao } from '../../../_lib/sessao.js';
import {
  carregarSala, carregarMembros, membroDe, carregarJogadas, estadoDaSala, semAcento
} from '../../../_lib/salas.js';

export async function onRequestPost({ request, env, params }) {
  const usuarioId = await usuarioDaRequisicao(request, env);
  if (!usuarioId) {
    return Response.json({ erro: 'Precisa estar logado para jogar.' }, { status: 401 });
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

  // Uma unica letra, sempre. Sem esse filtro alguem manda "ABCDE" e descobre
  // cinco letras numa jogada so.
  const letra = semAcento(String(corpo?.letra ?? '').toUpperCase());
  if (!/^[A-Z]$/.test(letra)) {
    return Response.json({ erro: 'Envie uma unica letra de A a Z.' }, { status: 400 });
  }

  const sala = await carregarSala(env, salaId);
  if (!sala) return Response.json({ erro: 'Sala nao encontrada.' }, { status: 404 });

  const membros = await carregarMembros(env, salaId);
  const eu = membroDe(membros, usuarioId);
  if (!eu) return Response.json({ erro: 'Voce nao esta nesta sala.' }, { status: 403 });

  if (sala.situacao !== 'jogando') {
    return Response.json({ erro: 'A sala nao esta em andamento.' }, { status: 409 });
  }
  if (eu.situacao !== 'jogando') {
    return Response.json({ erro: 'Sua partida nesta sala ja terminou.' }, { status: 409 });
  }

  const jogadas = await carregarJogadas(env, salaId, usuarioId);
  if (jogadas.some(j => j.letra === letra)) {
    return Response.json({ erro: 'Letra ja usada.' }, { status: 409 });
  }

  const reveladas = [];
  for (let i = 0; i < sala.normalizada.length; i++) {
    if (sala.normalizada[i] === letra) {
      reveladas.push({ posicao: i, caractere: sala.palavra[i] });
    }
  }

  const acertou = reveladas.length > 0;
  const certas = new Set(jogadas.filter(j => j.acertou === 1).map(j => j.letra));
  if (acertou) certas.add(letra);

  const erros = eu.erros + (acertou ? 0 : 1);
  const distintas = new Set(sala.normalizada.split(''));
  const venceu = [...distintas].every(l => certas.has(l));
  const perdeu = !venceu && erros >= sala.max_erros;

  const situacaoJogador = venceu ? 'venceu' : perdeu ? 'perdeu' : 'jogando';
  const acertos = certas.size;

  const operacoes = [
    env.DB.prepare(`
      INSERT INTO sala_jogadas (sala_id, usuario_id, letra, acertou)
      VALUES (?, ?, ?, ?)
    `).bind(salaId, usuarioId, letra, acertou ? 1 : 0),
    env.DB.prepare(`
      UPDATE sala_jogadores
      SET erros = ?, acertos = ?, situacao = ?,
          terminada_em = CASE WHEN ? = 'jogando' THEN NULL ELSE unixepoch() END
      WHERE sala_id = ? AND usuario_id = ?
    `).bind(erros, acertos, situacaoJogador, situacaoJogador, salaId, usuarioId)
  ];

  const adversario = membros.find(m => m.usuario_id !== usuarioId) || null;

  // Quem descobre a palavra fecha a sala na hora. Quem estoura os erros so
  // fecha se o outro tambem ja estourou — senao o outro ainda pode vencer.
  let encerramento = null;
  if (venceu) {
    encerramento = { vencedorId: usuarioId, motivo: 'palavra' };
  } else if (perdeu && adversario && adversario.situacao !== 'jogando') {
    let vencedorId = null;
    if (acertos !== adversario.acertos) {
      vencedorId = acertos > adversario.acertos ? usuarioId : adversario.usuario_id;
    }
    encerramento = { vencedorId, motivo: vencedorId ? 'erros' : 'empate' };
  }

  if (encerramento) {
    operacoes.push(
      env.DB.prepare(`
        UPDATE salas
        SET situacao = 'encerrada', vencedor_id = ?, motivo = ?, encerrada_em = unixepoch()
        WHERE id = ? AND situacao = 'jogando'
      `).bind(encerramento.vencedorId, encerramento.motivo, salaId),
      // Quem estava jogando e nao foi o autor da jogada perde por W.O. tecnico
      // da partida (a palavra acabou ou os erros acabaram para os dois).
      env.DB.prepare(`
        UPDATE sala_jogadores
        SET situacao = 'perdeu', terminada_em = unixepoch()
        WHERE sala_id = ? AND usuario_id <> ? AND situacao = 'jogando'
      `).bind(salaId, usuarioId)
    );
  }

  await env.DB.batch(operacoes);

  return Response.json(await estadoDaSala(env, salaId, usuarioId));
}
