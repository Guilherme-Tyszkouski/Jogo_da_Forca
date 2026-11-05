-- Salas de duelo AO VIVO (1 x 1, mesma palavra, os dois jogando ao mesmo tempo).
--
-- Diferente de "desafios" (duelo assincrono, cada um joga na sua hora), a sala
-- e a partida simultanea: os dois entram, recebem a MESMA palavra e disputam
-- quem descobre primeiro. A palavra continua sem sair do servidor: o cliente
-- so recebe as letras que ele mesmo acertou e os CONTADORES do adversario.
--
-- Migration forward-only: para corrigir algo aqui, crie a proxima numerada.

CREATE TABLE IF NOT EXISTS salas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo        TEXT    NOT NULL UNIQUE,          -- codigo curto para convite
  palavra_id    INTEGER NOT NULL REFERENCES palavras (id),
  criador_id    INTEGER NOT NULL REFERENCES usuarios (id),
  convidado_id  INTEGER REFERENCES usuarios (id),
  max_erros     INTEGER NOT NULL DEFAULT 6,
  -- aguardando | jogando | encerrada | cancelada
  situacao      TEXT    NOT NULL DEFAULT 'aguardando',
  vencedor_id   INTEGER REFERENCES usuarios (id),
  -- palavra | erros | desistencia | empate | cancelada
  motivo        TEXT,
  criada_em     INTEGER NOT NULL DEFAULT (unixepoch()),
  iniciada_em   INTEGER,
  encerrada_em  INTEGER
);

-- A lista de salas abertas e consultada o tempo todo pelo hub.
CREATE INDEX IF NOT EXISTS idx_salas_situacao ON salas (situacao, criada_em);

-- Uma linha por jogador da sala. "terminada_em" permite desempatar quem chegou
-- primeiro ao resultado quando os dois perdem.
CREATE TABLE IF NOT EXISTS sala_jogadores (
  sala_id       INTEGER NOT NULL REFERENCES salas (id),
  usuario_id    INTEGER NOT NULL REFERENCES usuarios (id),
  erros         INTEGER NOT NULL DEFAULT 0,
  -- Quantas letras distintas do jogador ja apareceram na palavra. E o que o
  -- adversario pode ver: quantidade, nunca QUAIS letras.
  acertos       INTEGER NOT NULL DEFAULT 0,
  -- jogando | venceu | perdeu | desistiu
  situacao      TEXT    NOT NULL DEFAULT 'jogando',
  entrou_em     INTEGER NOT NULL DEFAULT (unixepoch()),
  terminada_em  INTEGER,
  PRIMARY KEY (sala_id, usuario_id)
);

-- Letras chutadas dentro da sala. UNIQUE por (sala, jogador, letra) e o que
-- impede o jogador de recarregar a pagina para repetir a mesma letra.
CREATE TABLE IF NOT EXISTS sala_jogadas (
  sala_id     INTEGER NOT NULL REFERENCES salas (id),
  usuario_id  INTEGER NOT NULL REFERENCES usuarios (id),
  letra       TEXT    NOT NULL,
  acertou     INTEGER NOT NULL,
  jogada_em   INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (sala_id, usuario_id, letra)
);

CREATE INDEX IF NOT EXISTS idx_sala_jogadas ON sala_jogadas (sala_id, usuario_id);

-- Reacoes rapidas entre os jogadores (👍 😂 😱 🔥 😭 🤝). Nao e chat livre:
-- so passa o que estiver na lista fechada do servidor.
CREATE TABLE IF NOT EXISTS sala_eventos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sala_id     INTEGER NOT NULL REFERENCES salas (id),
  usuario_id  INTEGER NOT NULL REFERENCES usuarios (id),
  conteudo    TEXT    NOT NULL,
  criado_em   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sala_eventos ON sala_eventos (sala_id, id);
