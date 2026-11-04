-- Esquema inicial do Jogo da Forca no Cloudflare D1 (binding DB).
-- Migration forward-only: para corrigir algo aqui, crie a proxima numerada.

-- Dicionario. A coluna normalizada guarda a palavra sem acento, que e a forma
-- usada para comparar a letra chutada. A palavra com acento e o que aparece na
-- tela quando a partida termina.
CREATE TABLE IF NOT EXISTS palavras (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  palavra      TEXT    NOT NULL,
  normalizada  TEXT    NOT NULL,
  tamanho      INTEGER NOT NULL
);

-- Sorteio por faixa de tamanho fica caro sem indice quando a tabela passa de
-- alguns milhares de linhas.
CREATE INDEX IF NOT EXISTS idx_palavras_tamanho ON palavras (tamanho);

-- Jogadores. A identidade vem do OAuth do Google: guardamos o "sub", que e o
-- identificador estavel do usuario naquele provedor. Nenhuma senha aqui.
CREATE TABLE IF NOT EXISTS usuarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  provedor    TEXT    NOT NULL DEFAULT 'google',
  sub         TEXT    NOT NULL,
  nome        TEXT,
  email       TEXT,
  criado_em   INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (provedor, sub)
);

-- Duelo assincrono: os dois jogadores recebem a MESMA palavra e jogam cada um
-- de sua casa. O vencedor sai da comparacao de erros e tempo das duas partidas.
CREATE TABLE IF NOT EXISTS desafios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  palavra_id    INTEGER NOT NULL REFERENCES palavras (id),
  criador_id    INTEGER NOT NULL REFERENCES usuarios (id),
  convidado_id  INTEGER REFERENCES usuarios (id),
  codigo        TEXT    NOT NULL UNIQUE,
  situacao      TEXT    NOT NULL DEFAULT 'aberto',
  criado_em     INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Partidas. A palavra fica referenciada por id: o cliente recebe o id da
-- partida, o tamanho e nada mais. O servidor e quem sabe qual palavra e.
CREATE TABLE IF NOT EXISTS partidas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios (id),
  palavra_id     INTEGER NOT NULL REFERENCES palavras (id),
  desafio_id     INTEGER REFERENCES desafios (id),
  erros          INTEGER NOT NULL DEFAULT 0,
  situacao       TEXT    NOT NULL DEFAULT 'em_andamento',
  iniciada_em    INTEGER NOT NULL DEFAULT (unixepoch()),
  terminada_em   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_partidas_usuario ON partidas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_partidas_desafio ON partidas (desafio_id);

-- Letras ja chutadas em cada partida. Guardar isso no banco e o que impede o
-- jogador de recarregar a pagina para zerar os erros.
CREATE TABLE IF NOT EXISTS jogadas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  partida_id  INTEGER NOT NULL REFERENCES partidas (id),
  letra       TEXT    NOT NULL,
  acertou     INTEGER NOT NULL,
  jogada_em   INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (partida_id, letra)
);
