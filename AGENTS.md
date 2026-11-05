# Equipe de agentes — Jogo da Forca

Este arquivo define como os agentes de IA dividem o trabalho neste repositorio.
Ele vale para os agentes do Copilot em `.github/agents/`, e serve de referencia
para qualquer outro agente usado no projeto (Claude Code, OpenCode).

## Arquitetura alvo

- **Hospedagem:** Cloudflare Pages + Pages Functions.
- **Banco:** Cloudflare D1 (SQLite), acessado pelo binding `DB`.
- **Login:** OAuth 2.0 com Google (mesmo padrao do laboratorio anterior).
- **Multiplayer:** duelo assincrono. Dois jogadores recebem a mesma palavra,
  jogam separados, e o servidor compara erros e tempo. Mais um ranking geral.

### Regra de ouro da arquitetura

**A palavra sorteada nunca sai do servidor.**

Hoje o `script.js` guarda a palavra no navegador. Qualquer jogador abre o
DevTools e le a resposta. A partir da migracao para o backend:

- O cliente pede uma partida e recebe apenas: id da partida, quantidade de
  letras e categoria.
- O cliente envia uma letra; o servidor responde em quais posicoes ela aparece,
  ou que errou.
- A palavra completa so e devolvida quando a partida termina.

Qualquer mudanca que faca a palavra trafegar antes do fim da partida deve ser
rejeitada na revisao.

## Fronteiras de cada agente

Cada agente edita somente os caminhos da sua coluna. Se precisar de algo fora
do limite, descreve o que precisa no resumo em vez de editar.

| Agente | Pode editar | Nao edita |
|---|---|---|
| `frontend-developer` | `index.html`, `styles.css`, `public/**`, `src/client/**` | `functions/**`, `migrations/**`, `.github/workflows/**` |
| `frontend-reviewer` | nada (so revisa) | tudo |
| `backend-developer` | `functions/**`, `src/server/**` | `migrations/**`, `index.html`, `styles.css` |
| `backend-reviewer` | nada (so revisa) | tudo |
| `database-specialist` | `migrations/**`, `scripts/**` | `functions/**`, arquivos de interface |
| `devops-ci` | `.github/workflows/**`, `wrangler.toml`, `package.json` | codigo de aplicacao |

## Regras de segredo — valem para todos os agentes

1. Nenhum agente escreve o **valor** de um segredo em arquivo nenhum. Agente
   escreve o **nome** da variavel: `env.GOOGLE_CLIENT_SECRET`.
2. Segredos locais ficam em `.dev.vars`, que esta no `.gitignore`.
3. Segredos de producao ficam no Cloudflare, via `wrangler secret put` ou pelo
   painel. Quem digita o valor e a pessoa, nunca o agente.
4. Se um agente encontrar um segredo commitado, ele para, avisa, e nao tenta
   corrigir sozinho — a chave precisa ser rotacionada antes de qualquer coisa.
5. O `Client ID` do Google e publico e pode ficar no `wrangler.toml`. O
   `Client Secret` nao.

## Regra de honestidade

Nenhum agente afirma que testou algo que nao executou. Se nao rodou o teste,
escreve "nao validado" no resumo. Um agente que diz "funcionando" sem evidencia
custa mais tempo do que um que admite a duvida.

## Ordem de trabalho sugerida

1. `database-specialist` cria o esquema e carrega o dicionario.
2. `backend-developer` escreve as Functions de partida e de login.
3. `backend-reviewer` revisa com foco em segredo vazado, SQL injection e na
   regra de ouro acima.
4. `frontend-developer` troca o array local pelas chamadas a API.
5. `frontend-reviewer` confere acessibilidade e teclado.
6. `devops-ci` fecha o workflow de CI e o deploy.

## Procedimentos registrados

- `docs/oauth-cloudflare.md` — como configurar o login com Google e o D1 neste
  tipo de projeto, do deploy ao login funcionando, com as armadilhas que ja
  custaram tempo e marcando quais passos exigem uma pessoa.

Qualquer agente que for mexer em autenticacao, segredos ou banco le esse arquivo
antes de comecar.
