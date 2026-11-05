// Multiplayer ao vivo — hub, sala de espera e duelo 1 x 1.
//
// "Ao vivo" aqui e polling de 1 segundo contra /api/salas/:id/estado. Para um
// jogo de letras isso e indistinguivel de WebSocket para quem joga, e nao exige
// Durable Objects no Cloudflare. Toda a conversa com o servidor esta isolada em
// consultarEstado(), entao trocar o transporte depois e uma mudanca local.
//
// O cliente nunca recebe a palavra durante a partida: desenha apenas o que o
// servidor autorizou (letras que ELE acertou) e os contadores do rival.

(function () {
  const comum = window.ForcaComum;
  const $ = id => document.getElementById(id);

  const estado = {
    usuario: null,
    salaId: null,
    codigo: null,
    tamanhoEscolhido: 'curta',
    pollAtivo: false,
    pollTimer: null,
    ocupado: false,
    dicaVisivel: false,
    dados: null,
    resultadoMostrado: false,
    eventosMostrados: new Set(),
    tela: 'hub'
  };

  const views = {
    hub: $('view-hub'),
    sala: $('view-sala'),
    duelo: $('view-duelo'),
    solo: $('view-solo')
  };

  const TAMANHO_CHAVE = 'forca:tamanho';
  const SALA_PENDENTE = 'forca:sala-pendente';

  // --------------------------------------------------------------- navegacao

  function mostrarTela(nome) {
    Object.entries(views).forEach(([chave, elemento]) => {
      elemento.hidden = chave !== nome;
    });
    document.body.dataset.tela = nome;
    estado.tela = nome;
    window.scrollTo(0, 0);
  }

  function aviso(mensagem) {
    const toast = $('toast');
    toast.textContent = mensagem;
    toast.hidden = false;
    clearTimeout(aviso.timer);
    aviso.timer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function voltarAoHub(mensagem) {
    pararPolling();
    estado.salaId = null;
    estado.codigo = null;
    estado.dados = null;
    estado.resultadoMostrado = false;
    estado.dicaVisivel = false;
    history.replaceState(null, '', '/');
    mostrarTela('hub');
    if (mensagem) aviso(mensagem);
    carregarSalas();
  }

  function urlComSala(codigo) {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('sala', codigo);
    return url.toString();
  }

  function linkConvite(codigo) {
    return `${window.location.origin}/?sala=${codigo}`;
  }

  // ----------------------------------------------------------------- usuario

  async function renderizarUsuario() {
    const area = $('areaUsuario');
    area.replaceChildren();

    const usuario = estado.usuario;
    if (!usuario) {
      const entrar = document.createElement('a');
      entrar.className = 'btn btn-primary btn-sm';
      entrar.href = '/api/auth/login';
      entrar.textContent = 'Entrar com Google';
      area.append(entrar);
      return;
    }

    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = comum.iniciais(usuario);

    const nome = document.createElement('span');
    nome.className = 'user-name';
    nome.textContent = comum.primeiroNome(usuario);

    const sair = document.createElement('a');
    sair.className = 'btn btn-ghost btn-sm';
    sair.href = '/api/auth/sair';
    sair.textContent = 'Sair';

    area.append(avatar, nome, sair);
  }

  // ------------------------------------------------------------------- hub

  async function carregarSalas() {
    const lista = $('listaSalas');
    if (!estado.usuario) {
      lista.replaceChildren(avisoLista('Entre com Google para ver as salas.'));
      return;
    }

    lista.replaceChildren(avisoLista('Carregando salas…'));

    let dados;
    try {
      dados = await comum.pedir('/api/salas');
    } catch (erro) {
      lista.replaceChildren(avisoLista(erro.status === 401
        ? 'Entre com Google para ver as salas.'
        : 'Não foi possível carregar as salas agora.'));
      return;
    }

    if (!dados.salas.length) {
      lista.replaceChildren(avisoLista('Nenhuma sala aberta. Crie a sua e chame alguém.'));
      return;
    }

    lista.replaceChildren(...dados.salas.map(sala => {
      const item = document.createElement('li');
      item.className = 'sala-item';

      const info = document.createElement('div');
      info.className = 'sala-info';

      const criador = document.createElement('strong');
      criador.textContent = sala.criador;

      const detalhe = document.createElement('span');
      detalhe.textContent = `${sala.tamanho} letras · esperando adversário`;

      info.append(criador, detalhe);

      const entrar = document.createElement('button');
      entrar.type = 'button';
      entrar.className = 'btn btn-secondary btn-sm';
      entrar.textContent = 'Entrar';
      entrar.addEventListener('click', () => entrarPorCodigo(sala.codigo));

      item.append(info, entrar);
      return item;
    }));
  }

  function avisoLista(texto) {
    const item = document.createElement('li');
    item.className = 'sala-empty';
    item.textContent = texto;
    return item;
  }

  async function criarSala() {
    if (!estado.usuario) {
      aviso('Entre com Google para criar sua sala.');
      return;
    }

    const botoes = [$('criarSalaRapida'), $('criarSalaConfirmar')];
    botoes.forEach(b => { b.disabled = true; });
    $('criarMsg').textContent = 'Sorteando palavra…';

    try {
      const sala = await comum.pedir('/api/salas', { tamanho: estado.tamanhoEscolhido });
      $('criarMsg').textContent = '';
      abrirSala(sala.codigo, sala.id);
    } catch (erro) {
      $('criarMsg').textContent = erro.status === 401
        ? 'Entre com Google para criar sua sala.'
        : erro.message;
    } finally {
      botoes.forEach(b => { b.disabled = false; });
    }
  }

  async function entrarPorCodigo(codigoInformado, silencioso = false) {
    const codigo = String(codigoInformado || '').trim().toUpperCase();
    if (!codigo) return;

    $('codigoInput').value = codigo;

    if (!estado.usuario) {
      localStorage.setItem(SALA_PENDENTE, codigo);
      $('entrarMsg').textContent = 'Entre com Google para entrar na sala.';
      return;
    }

    $('entrarMsg').textContent = 'Entrando…';

    try {
      const sala = await comum.pedir('/api/salas/entrar', { codigo });
      $('entrarMsg').textContent = '';
      localStorage.removeItem(SALA_PENDENTE);
      abrirSala(sala.codigo, sala.id);
    } catch (erro) {
      $('entrarMsg').textContent = erro.message;
      if (!silencioso) aviso(erro.message);
    }
  }

  function abrirSala(codigo, id) {
    estado.codigo = codigo;
    estado.salaId = id;
    estado.resultadoMostrado = false;
    estado.dicaVisivel = false;
    estado.eventosMostrados.clear();

    history.replaceState(null, '', urlComSala(codigo));
    mostrarTela('sala');
    renderizarSalaEspera();
    iniciarPolling();
  }

  // ---------------------------------------------------------- sala de espera

  function renderizarSalaEspera() {
    const dados = estado.dados;
    const codigo = estado.codigo;
    if (!codigo) return;

    $('salaCodigo').textContent = codigo;
    const link = linkConvite(codigo);
    $('linkConvite').value = link;
    $('whatsappLink').href = `https://wa.me/?text=${encodeURIComponent(
      `Vem jogar forca comigo! Entra na sala ${codigo}: ${link}`
    )}`;

    if (estado.usuario) {
      $('slotEuNome').textContent = comum.primeiroNome(estado.usuario);
      $('slotEuAvatar').textContent = comum.iniciais(estado.usuario);
    }

    const rival = dados?.rival;
    const slotRival = $('slotRival');
    if (rival) {
      slotRival.classList.remove('vazio');
      slotRival.querySelector('strong').textContent = rival.nome;
      const avatar = slotRival.querySelector('.avatar');
      avatar.classList.remove('vazio');
      avatar.textContent = rival.nome.slice(0, 2).toUpperCase();
      slotRival.querySelector('.slot-status').textContent = 'Entrou';
    } else {
      slotRival.classList.add('vazio');
      slotRival.querySelector('strong').textContent = 'Aguardando…';
      const avatar = slotRival.querySelector('.avatar');
      avatar.classList.add('vazio');
      avatar.replaceChildren();
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      avatar.append(spinner);
      slotRival.querySelector('.slot-status').textContent = 'Compartilhe o link';
    }
  }

  async function copiar(texto, rotulo) {
    try {
      await navigator.clipboard.writeText(texto);
      aviso(`${rotulo} copiado!`);
    } catch {
      aviso('Não foi possível copiar. Selecione e copie manualmente.');
    }
  }

  async function sairDaSala() {
    if (!estado.salaId) return;
    pararPolling();
    try {
      await comum.pedir(`/api/salas/${estado.salaId}/sair`, {});
    } catch {
      // Se a requisicao falhar, o polling vai perceber o estado real; sair da
      // tela mesmo assim e melhor do que prender o jogador.
    }
    voltarAoHub();
  }

  // ------------------------------------------------------------------ polling

  function iniciarPolling() {
    pararPolling();
    estado.pollAtivo = true;
    consultarEstado();
  }

  function pararPolling() {
    estado.pollAtivo = false;
    clearTimeout(estado.pollTimer);
    estado.pollTimer = null;
  }

  async function consultarEstado() {
    if (!estado.pollAtivo || !estado.salaId) return;

    // Aba escondida: nao gasta requisicao nem escrita no D1.
    if (document.hidden) {
      estado.pollTimer = setTimeout(consultarEstado, 1500);
      return;
    }

    try {
      const dados = await comum.pedir(`/api/salas/${estado.salaId}/estado`);
      aplicarEstado(dados);
    } catch (erro) {
      if (erro.status === 404 || erro.status === 403) {
        pararPolling();
        voltarAoHub('Esta sala não está mais disponível.');
        return;
      }
      // 500, rede caindo etc.: tenta de novo no proximo ciclo.
    }

    if (estado.pollAtivo) {
      estado.pollTimer = setTimeout(consultarEstado, 1000);
    }
  }

  function aplicarEstado(dados) {
    estado.dados = dados;
    const { sala } = dados;

    if (sala.situacao === 'cancelada') {
      pararPolling();
      voltarAoHub('A sala foi cancelada.');
      return;
    }

    if (sala.situacao === 'aguardando') {
      if (estado.tela !== 'sala') mostrarTela('sala');
      renderizarSalaEspera();
      return;
    }

    if (estado.tela !== 'duelo') {
      mostrarTela('duelo');
      prepararTabuleiro();
    }

    renderizarDuelo(dados);
    renderizarEventos(dados);

    if (sala.situacao === 'encerrada') {
      pararPolling();
      if (!estado.resultadoMostrado) {
        estado.resultadoMostrado = true;
        mostrarResultado(dados);
      }
    }
  }

  // ------------------------------------------------------------------- duelo

  function prepararTabuleiro() {
    estado.dicaVisivel = false;
    $('dueloDica').textContent = '';
    $('dueloCategoria').textContent = 'PALAVRA MISTERIOSA';
    montarTecladoDuelo();
  }

  function montarTecladoDuelo() {
    const teclado = $('keyboardDuelo');
    if (teclado.childElementCount) return;

    [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].forEach(letra => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'letra-btn';
      botao.textContent = letra;
      botao.dataset.letter = letra;
      botao.setAttribute('aria-label', `Letra ${letra}`);
      botao.addEventListener('click', () => chutar(letra));
      teclado.append(botao);
    });
  }

  function renderizarDuelo(dados) {
    const { sala, eu, rival } = dados;

    $('dueloCodigo').textContent = `sala ${sala.codigo}`;
    $('dueloEuNome').textContent = 'Você';
    $('dueloEuAvatar').textContent = comum.iniciais(estado.usuario);

    if (rival) {
      $('dueloRivalNome').textContent = rival.nome;
      $('dueloRivalAvatar').textContent = rival.nome.slice(0, 2).toUpperCase();
      $('dueloRivalAcertos').textContent = `${rival.acertos} ${rival.acertos === 1 ? 'letra' : 'letras'}`;
      renderizarPips($('dueloRivalPips'), rival.erros, sala.maxErros);
    }

    $('dueloEuAcertos').textContent = `${eu.acertos} ${eu.acertos === 1 ? 'letra' : 'letras'}`;
    renderizarPips($('dueloEuPips'), eu.erros, sala.maxErros);

    $('dueloStatus').textContent = textoDeStatus(dados);

    // Palavra: o servidor manda posicoes ja reveladas. O resto fica vazio.
    const palavra = $('wordDuelo');
    const reveladas = new Map(eu.reveladas.map(r => [r.posicao, r.caractere]));
    palavra.replaceChildren();
    for (let i = 0; i < sala.tamanho; i++) {
      const slot = document.createElement('span');
      slot.className = 'letter-slot';
      slot.textContent = reveladas.get(i) ?? '';
      palavra.append(slot);
    }
    palavra.setAttribute('aria-label', `${sala.tamanho} letras, ${reveladas.size} reveladas`);

    $('mistakesDuelo').textContent = `${eu.erros} / ${sala.maxErros} erros`;

    // Boneco do duelo (classes proprias: nao mexe no boneco do modo solo).
    document.querySelectorAll('#view-duelo .duel-part').forEach(parte => {
      parte.classList.toggle('visible', Number(parte.dataset.parte) < eu.erros);
    });

    const minhasLetras = new Set(eu.letras);
    const letrasCertas = new Set(eu.reveladas.map(r => semAcento(r.caractere)));
    const podeJogar = sala.situacao === 'jogando' && eu.situacao === 'jogando' && !estado.ocupado;

    document.querySelectorAll('#keyboardDuelo .letra-btn').forEach(botao => {
      const letra = botao.dataset.letter;
      const usada = minhasLetras.has(letra);
      botao.disabled = usada || !podeJogar;
      botao.classList.toggle('certa', usada && letrasCertas.has(letra));
      botao.classList.toggle('errada', usada && !letrasCertas.has(letra));
    });

    if (estado.dicaVisivel) {
      $('dueloDica').textContent = sala.definicao || 'Esta palavra não tem dica no dicionário.';
    }
  }

  function renderizarPips(container, erros, maximo) {
    container.replaceChildren();
    for (let i = 0; i < maximo; i++) {
      const pip = document.createElement('span');
      pip.className = i < erros ? 'pip pip-cheio' : 'pip';
      container.append(pip);
    }
    container.setAttribute('aria-label', `${erros} de ${maximo} erros`);
  }

  function textoDeStatus(dados) {
    const { sala, eu, rival } = dados;

    if (sala.situacao === 'encerrada') {
      if (sala.vencedorId === null) return 'Empate';
      return sala.vencedorId === eu.id ? 'Você venceu' : 'Você perdeu';
    }
    if (eu.situacao !== 'jogando') return 'Sua partida terminou';
    if (rival && rival.situacao !== 'jogando') return 'Você ainda pode vencer';
    return 'Sua vez';
  }

  const semAcento = texto => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '');

  async function chutar(letra) {
    if (estado.ocupado || !estado.salaId || !estado.dados) return;
    const { sala, eu } = estado.dados;
    if (sala.situacao !== 'jogando' || eu.situacao !== 'jogando') return;

    estado.ocupado = true;
    const botao = document.querySelector(`#keyboardDuelo [data-letter="${letra}"]`);
    if (botao) botao.disabled = true;

    try {
      aplicarEstado(await comum.pedir(`/api/salas/${estado.salaId}/chute`, { letra }));
    } catch (erro) {
      if (botao && erro.status !== 409) botao.disabled = false;
      aviso(erro.message);
    } finally {
      // aplicarEstado rodou com ocupado=true e travou o teclado; agora que a
      // resposta chegou, redesenha liberando as letras ainda nao usadas.
      estado.ocupado = false;
      if (estado.dados && estado.tela === 'duelo') renderizarDuelo(estado.dados);
    }
  }

  async function reacao(emoji) {
    if (!estado.salaId) return;
    try {
      await comum.pedir(`/api/salas/${estado.salaId}/emoji`, { emoji });
    } catch (erro) {
      aviso(erro.message);
    }
  }

  function renderizarEventos(dados) {
    const container = $('eventos');
    const nomes = new Map([[dados.eu.id, 'Você']]);
    if (dados.rival) nomes.set(dados.rival.id, dados.rival.nome);

    container.replaceChildren();
    dados.eventos.slice(-5).forEach(evento => {
      const linha = document.createElement('div');
      linha.className = 'evento';

      const quem = document.createElement('span');
      quem.className = 'evento-quem';
      quem.textContent = nomes.get(evento.usuario_id) || 'Jogador';

      const emoji = document.createElement('span');
      emoji.className = 'evento-emoji';
      emoji.textContent = evento.conteudo;

      linha.append(quem, emoji);

      if (!estado.eventosMostrados.has(evento.id)) {
        estado.eventosMostrados.add(evento.id);
        linha.classList.add('novo');
      }
      container.append(linha);
    });
  }

  function mostrarResultado(dados) {
    const { sala, eu, rival } = dados;
    const venceu = sala.vencedorId === eu.id;
    const empate = sala.vencedorId === null;
    const palavra = dados.palavra ? `A palavra era “${dados.palavra}”.` : '';

    let titulo;
    let mensagem;

    if (empate) {
      titulo = 'Empate';
      mensagem = `Os dois pararam no mesmo ponto. ${palavra}`;
    } else if (venceu) {
      titulo = 'Você venceu!';
      mensagem = sala.motivo === 'desistencia'
        ? `${rival?.nome || 'O rival'} desistiu. ${palavra}`
        : `Você chegou primeiro. ${palavra}`;
    } else {
      titulo = 'Você perdeu';
      mensagem = sala.motivo === 'desistencia'
        ? `Você desistiu. ${palavra}`
        : `${rival?.nome || 'O rival'} chegou primeiro. ${palavra}`;
    }

    if (sala.motivo === 'erros') {
      mensagem = `${mensagem} Decidido pelo número de letras reveladas.`;
    }

    $('dueloIcone').textContent = empate ? '🤝' : venceu ? '🏆' : '💀';
    $('dueloTitulo').textContent = titulo;
    $('dueloMensagem').textContent = mensagem;
    $('dueloNovaSala').textContent = venceu ? 'Jogar de novo' : 'Nova sala';
    $('dueloDialogo').showModal();
  }

  function novaSalaDepoisDoDuelo() {
    $('dueloDialogo').close();
    pararPolling();
    estado.salaId = null;
    estado.codigo = null;
    estado.dados = null;
    estado.resultadoMostrado = false;
    mostrarTela('hub');
    criarSala();
  }

  // -------------------------------------------------------------------- solo

  async function abrirSolo() {
    pararPolling();
    mostrarTela('solo');
    await window.ForcaSolo.iniciar();
  }

  // ------------------------------------------------------------------ eventos

  function ligarEventos() {
    $('brandLink').addEventListener('click', event => {
      event.preventDefault();
      voltarAoHub();
    });

    $('criarSalaRapida').addEventListener('click', criarSala);
    $('criarSalaConfirmar').addEventListener('click', criarSala);
    $('jogarSolo').addEventListener('click', abrirSolo);
    $('voltarDoSolo').addEventListener('click', () => voltarAoHub());
    $('atualizarSalas').addEventListener('click', carregarSalas);

    document.querySelectorAll('[data-tamanho]').forEach(botao => {
      botao.addEventListener('click', () => {
        document.querySelectorAll('[data-tamanho]').forEach(outro => {
          outro.setAttribute('aria-checked', String(outro === botao));
        });
        estado.tamanhoEscolhido = botao.dataset.tamanho;
        localStorage.setItem(TAMANHO_CHAVE, estado.tamanhoEscolhido);
      });
    });

    $('formEntrar').addEventListener('submit', event => {
      event.preventDefault();
      entrarPorCodigo($('codigoInput').value);
    });

    $('codigoInput').addEventListener('input', event => {
      event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    $('copiarCodigo').addEventListener('click', () => copiar(estado.codigo || '', 'Código'));
    $('copiarLink').addEventListener('click', () => copiar(linkConvite(estado.codigo || ''), 'Link'));
    $('cancelarSala').addEventListener('click', sairDaSala);

    $('emotes').addEventListener('click', event => {
      const botao = event.target.closest('[data-emoji]');
      if (botao) reacao(botao.dataset.emoji);
    });

    $('dicaDuelo').addEventListener('click', () => {
      estado.dicaVisivel = !estado.dicaVisivel;
      $('dicaDuelo').textContent = estado.dicaVisivel ? 'Esconder dica' : 'Mostrar dica';
      const definicao = estado.dados?.sala?.definicao;
      $('dueloDica').textContent = estado.dicaVisivel
        ? (definicao || 'Esta palavra não tem dica no dicionário.')
        : '';
    });

    $('desistirDuelo').addEventListener('click', () => {
      if (window.confirm('Desistir da partida? O rival vence.')) sairDaSala();
    });

    $('dueloNovaSala').addEventListener('click', novaSalaDepoisDoDuelo);
    $('dueloVoltar').addEventListener('click', () => {
      $('dueloDialogo').close();
      voltarAoHub();
    });

    document.addEventListener('keydown', event => {
      if (estado.tela !== 'duelo') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if ($('dueloDialogo').open) return;
      const letra = semAcento(event.key).toUpperCase();
      if (/^[A-Z]$/.test(letra)) chutar(letra);
    });
  }

  // ------------------------------------------------------------------- inicio

  async function iniciar() {
    estado.usuario = await comum.carregarUsuario();
    renderizarUsuario();
    ligarEventos();

    const salvo = localStorage.getItem(TAMANHO_CHAVE);
    if (salvo) {
      estado.tamanhoEscolhido = salvo;
      document.querySelectorAll('[data-tamanho]').forEach(botao => {
        botao.setAttribute('aria-checked', String(botao.dataset.tamanho === salvo));
      });
    }

    const parametro = new URLSearchParams(window.location.search).get('sala');
    const pendente = parametro || localStorage.getItem(SALA_PENDENTE);
    if (parametro) localStorage.setItem(SALA_PENDENTE, parametro.toUpperCase());

    await carregarSalas();

    if (pendente) {
      if (estado.usuario) entrarPorCodigo(pendente, true);
      else {
        $('codigoInput').value = pendente.toUpperCase();
        $('entrarMsg').textContent = 'Entre com Google para entrar na sala que te convidaram.';
      }
    }
  }

  iniciar();
})();
