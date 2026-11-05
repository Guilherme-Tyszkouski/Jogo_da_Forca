// Regras compartilhadas das salas de duelo ao vivo.
//
// Tudo que decide jogo mora aqui: sorteio da palavra, validacao de letra,
// contagem de erros, quem venceu e o que o cliente pode ver. Os endpoints em
// functions/api/salas/ sao apenas a porta de entrada.
//
// Regra de ouro: a palavra NUNCA viaja para o cliente enquanto a sala estiver
// em andamento. O adversario recebe apenas CONTADORES (erros e acertos). Nem as
// letras que ele chutou sao reveladas, porque uma letra certa do rival tambem
// entregaria informacao sobre a palavra.

export const MAX_ERROS = 6;

// Sem I, O, 0 e 1: o codigo e lido em voz alta e digitado a mao.
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const EMOJIS_PERMITIDOS = new Set(['👍', '😂', '😱', '🔥', '😭', '🤝']);

export const semAcento = texto => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '');

export function gerarCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let codigo = '';
  for (const byte of bytes) codigo += ALFABETO_CODIGO[byte % ALFABETO_CODIGO.length];
  return codigo;
}

export function nomeExibicao(usuario) {
  const nome = (usuario?.nome || usuario?.email || 'Jogador').trim();
  return nome.split(/\s+/)[0];
}

// Faixa de tamanho escolhida no hub. Sem escolha, sorteia qualquer palavra.
export function faixaDeTamanho(faixa) {
  if (faixa === 'curta') return { minimo: 4, maximo: 6 };
  if (faixa === 'media') return { minimo: 7, maximo: 9 };
  if (faixa === 'longa') return { minimo: 10, maximo: 99 };
  return null;
}

export async function sortearPalavra(env, faixa) {
  const limites = faixaDeTamanho(faixa);
  const sql = limites
    ? 'SELECT id, tamanho, definicao FROM palavras WHERE tamanho BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1'
    : 'SELECT id, tamanho, definicao FROM palavras ORDER BY RANDOM() LIMIT 1';
  const comando = env.DB.prepare(sql);
  const palavra = limites
    ? await comando.bind(limites.minimo, limites.maximo).first()
    : await comando.first();

  // Faixa sem nenhuma palavra (dicionario pequeno): cai para o sorteio geral
  // em vez de deixar o jogador sem sala.
  if (!palavra && limites) {
    return env.DB.prepare('SELECT id, tamanho, definicao FROM palavras ORDER BY RANDOM() LIMIT 1').first();
  }
  return palavra;
}

export async function carregarSala(env, salaId) {
  return env.DB.prepare(`
    SELECT s.id, s.codigo, s.palavra_id, s.criador_id, s.convidado_id, s.max_erros,
           s.situacao, s.vencedor_id, s.motivo, s.criada_em, s.iniciada_em, s.encerrada_em,
           w.palavra, w.normalizada, w.definicao, w.tamanho AS tamanho_palavra
    FROM salas s
    JOIN palavras w ON w.id = s.palavra_id
    WHERE s.id = ?
  `).bind(salaId).first();
}

export async function carregarSalaPorCodigo(env, codigo) {
  return env.DB.prepare(`
    SELECT s.id, s.codigo, s.palavra_id, s.criador_id, s.convidado_id, s.max_erros,
           s.situacao, s.vencedor_id, s.motivo, s.criada_em, s.iniciada_em, s.encerrada_em,
           w.palavra, w.normalizada, w.definicao, w.tamanho AS tamanho_palavra
    FROM salas s
    JOIN palavras w ON w.id = s.palavra_id
    WHERE s.codigo = ?
  `).bind(codigo).first();
}

export async function carregarMembros(env, salaId) {
  const { results } = await env.DB.prepare(`
    SELECT j.usuario_id, j.erros, j.acertos, j.situacao, j.entrou_em, j.terminada_em,
           u.nome, u.email
    FROM sala_jogadores j
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE j.sala_id = ?
    ORDER BY j.entrou_em, j.usuario_id
  `).bind(salaId).all();
  return results;
}

export function membroDe(membros, usuarioId) {
  return membros.find(m => m.usuario_id === usuarioId) || null;
}

export async function carregarJogadas(env, salaId, usuarioId) {
  const { results } = await env.DB.prepare(`
    SELECT letra, acertou, jogada_em
    FROM sala_jogadas
    WHERE sala_id = ? AND usuario_id = ?
    ORDER BY jogada_em, letra
  `).bind(salaId, usuarioId).all();
  return results;
}

// Ao encerrar uma sala por erros, o vencedor e quem revelou mais letras. Se os
// dois chegaram ao mesmo ponto, empata. (O tempo nao entra: quem perdeu por
// ultimo nao jogou melhor.)
function decidirPorErros(membros, meuId) {
  const [a, b] = membros;
  if (!a || !b) return { vencedorId: null, motivo: 'empate' };
  if (a.acertos === b.acertos) return { vencedorId: null, motivo: 'empate' };
  return { vencedorId: a.acertos > b.acertos ? a.usuario_id : b.usuario_id, motivo: 'erros' };
}

// Reparo preguicoso: se as duas partidas terminaram mas a sala ficou "jogando"
// (duas requisicoes simultaneas podem nao ter visto uma a outra), fecha agora.
// Chamado em toda leitura de estado, entao a sala nunca fica travada.
export async function repararSala(env, sala, membros) {
  if (sala.situacao !== 'jogando') return sala;
  if (membros.length < 2) return sala;
  if (membros.some(m => m.situacao === 'jogando')) return sala;

  const { vencedorId, motivo } = decidirPorErros(membros, null);
  await env.DB.prepare(`
    UPDATE salas
    SET situacao = 'encerrada', vencedor_id = ?, motivo = ?, encerrada_em = unixepoch()
    WHERE id = ? AND situacao = 'jogando'
  `).bind(vencedorId, motivo, sala.id).run();

  return carregarSala(env, sala.id);
}

// Monta o que o cliente pode ver. Devolve null quando quem pediu nao e membro
// da sala — o endpoint transforma isso em 403 e nao em "sala nao encontrada",
// para nao confirmar a existencia de salas alheias.
export async function estadoDaSala(env, salaId, usuarioId) {
  let sala = await carregarSala(env, salaId);
  if (!sala) return null;

  let membros = await carregarMembros(env, salaId);
  const eu = membroDe(membros, usuarioId);
  if (!eu) return null;

  sala = await repararSala(env, sala, membros);
  if (sala.situacao === 'encerrada' && membros.length < 2) {
    // Sala encerrada sem os dois jogadores nao deveria acontecer; segue com a
    // lista antiga para nao quebrar a tela de quem ficou.
  } else if (sala.situacao === 'encerrada') {
    membros = await carregarMembros(env, salaId);
  }

  const jogadas = await carregarJogadas(env, salaId, usuarioId);
  const letrasCertas = new Set(jogadas.filter(j => j.acertou === 1).map(j => j.letra));

  // Posicao E caractere: o cliente desenha FUNCAO com til quando acerta O.
  const reveladas = [];
  for (let i = 0; i < sala.normalizada.length; i++) {
    const letra = sala.normalizada[i];
    if (letrasCertas.has(letra)) {
      reveladas.push({ posicao: i, caractere: sala.palavra[i] });
    }
  }

  const rival = membros.find(m => m.usuario_id !== usuarioId) || null;

  const { results: eventosCru } = await env.DB.prepare(`
    SELECT id, usuario_id, conteudo
    FROM sala_eventos
    WHERE sala_id = ?
    ORDER BY id DESC
    LIMIT 8
  `).bind(salaId).all();

  const palavraEncerrada = sala.situacao === 'encerrada' || sala.situacao === 'cancelada';

  return {
    sala: {
      id: sala.id,
      codigo: sala.codigo,
      situacao: sala.situacao,
      maxErros: sala.max_erros,
      tamanho: sala.tamanho_palavra,
      criadaEm: sala.criada_em,
      iniciadaEm: sala.iniciada_em,
      encerradaEm: sala.encerrada_em,
      vencedorId: sala.vencedor_id,
      motivo: sala.motivo,
      souCriador: sala.criador_id === usuarioId,
      // A definicao ja vem mascarada do banco (a palavra repetida vira ____),
      // entao pode servir de dica para os dois jogadores.
      definicao: sala.definicao ?? null
    },
    eu: {
      id: eu.usuario_id,
      nome: nomeExibicao(eu),
      erros: eu.erros,
      acertos: eu.acertos,
      situacao: eu.situacao,
      reveladas,
      letras: jogadas.map(j => j.letra)
    },
    // Nunca as letras do rival: so os contadores.
    rival: rival
      ? {
          id: rival.usuario_id,
          nome: nomeExibicao(rival),
          erros: rival.erros,
          acertos: rival.acertos,
          situacao: rival.situacao
        }
      : null,
    palavra: palavraEncerrada ? sala.palavra : null,
    eventos: eventosCru.reverse()
  };
}

export { decidirPorErros };
