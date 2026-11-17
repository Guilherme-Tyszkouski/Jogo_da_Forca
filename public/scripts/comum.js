// Utilidades compartilhadas pelo modo solo (script.js) e pelo multiplayer
// (multiplayer.js). Carregado antes dos dois.
//
// O objetivo e ter UMA definicao de "quem esta logado" e UMA forma de falar
// com /api, para que os dois modos nao divirjam no tratamento de erro.

window.ForcaComum = {
  usuario: null,
  carregou: false,

  async pedir(caminho, corpo) {
    const opcoes = { method: corpo === undefined ? 'GET' : 'POST' };
    if (corpo !== undefined) {
      opcoes.headers = { 'Content-Type': 'application/json' };
      opcoes.body = JSON.stringify(corpo);
    }

    const resposta = await fetch(caminho, opcoes);
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw Object.assign(new Error(dados.erro || 'Falha na requisicao'), {
        status: resposta.status,
        dados
      });
    }
    return dados;
  },

  async carregarUsuario(recarregar = false) {
    if (this.carregou && !recarregar) return this.usuario;
    try {
      const dados = await this.pedir('/api/auth/eu');
      this.usuario = dados.autenticado ? dados : null;
    } catch {
      this.usuario = null;
    }
    this.carregou = true;
    return this.usuario;
  },

  primeiroNome(usuario) {
    const nome = (usuario?.nome || usuario?.email || 'Jogador').trim();
    return nome.split(/\s+/)[0];
  },

  iniciais(usuario) {
    const nome = (usuario?.nome || usuario?.email || '?').trim();
    const partes = nome.split(/\s+/);
    return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase();
  }
};
