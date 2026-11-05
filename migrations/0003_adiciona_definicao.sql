-- Guarda a definicao de cada palavra, usada como dica textual.
-- Fica NULL quando o dicionario aberto nao tem verbete para a palavra.
ALTER TABLE palavras ADD COLUMN definicao TEXT;
