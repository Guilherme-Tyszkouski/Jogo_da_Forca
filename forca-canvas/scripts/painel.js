// painel.js: monta o painel (perfil e cards) com os dados de exemplo e liga a
// barra lateral (recolher no computador, menu por cima da tela no celular).
//
// Nao depende do jogo: so le DADOS_EXEMPLO (dados-exemplo.js) e o HTML.
// Tudo fica dentro de uma funcao que roda na hora, para nenhum nome daqui
// colidir com os nomes globais dos scripts do jogo (teclado, tela, estado...).
//
// Regras: os textos entram com textContent (nunca innerHTML com dados) e o
// visual muda so por classes BEM (classList). Classes de estado ligadas aqui:
//   sidebar_state_collapsed  barra recolhida (so icones), so no computador
//   sidebar_state_open       menu aberto por cima da tela, so no celular
//   page_sidebar_collapsed   no <body>: a coluna da barra fica estreita
//   page_menu_open           no <body>: menu do celular aberto (fundo escuro)

(function () {
  // Mesmo limite do CSS: abaixo de 640px a barra vira menu
  const CELULAR = window.matchMedia("(max-width: 639px)");
  const CHAVE_RECOLHIDA = "forca-canvas-barra-recolhida"; // nome no localStorage

  const corpo = document.body;
  const barra = document.getElementById("barraLateral");
  const botaoRecolher = document.getElementById("recolherBarra");
  const botaoMenu = document.getElementById("menuBotao");

  // O que fica atras do menu aberto no celular: jogo, cards e o resto do
  // cabecalho (menos o botao de menu, que precisa continuar fechando o menu)
  const atrasDoMenu = [
    document.querySelector(".page__main"),
    document.querySelector(".page__aside"),
    ...Array.from(botaoMenu.parentElement.children).filter(function (filho) {
      return filho !== botaoMenu;
    })
  ].filter(Boolean);

  let recolhida = false; // escolha do jogador no computador (lembrada)
  let menuAberto = false; // menu do celular

  // ------------------------------------------------------------ utilitario

  // Cria um elemento com classes e, se vier, um texto (sempre textContent)
  function criar(tag, classes, texto) {
    const elemento = document.createElement(tag);
    if (classes) elemento.className = classes;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
  }

  // Sigla visivel ("BR") e o nome do pais so para o leitor de tela ("Brasil")
  function criarPais(pais) {
    const caixa = criar("span", "card__country");
    const sigla = criar("span", "card__country-code", pais.sigla);
    sigla.setAttribute("aria-hidden", "true");
    caixa.append(sigla, criar("span", "visually-hidden", pais.nome));
    return caixa;
  }

  // "Tyszkowski (402) BR"
  function criarJogador(pessoa) {
    const caixa = criar("span", "card__player");
    caixa.append(
      criar("span", "card__player-name", pessoa.nick),
      " ",
      criar("span", "card__player-rating", "(" + pessoa.rating + ")"),
      " ",
      criarPais(pessoa.pais)
    );
    return caixa;
  }

  // "2026-11-16" -> "16/11"
  function dataCurta(iso) {
    const partes = iso.split("-");
    return partes[2] + "/" + partes[1];
  }

  // ------------------------------------------------------------ montagem

  function montarPerfil(jogador) {
    document.getElementById("perfilNick").textContent = jogador.nick;
    const status = document.getElementById("perfilStatus");
    status.classList.toggle("profile__status_state_online", jogador.online);
    status.classList.toggle("profile__status_state_offline", !jogador.online);
    document.getElementById("perfilStatusTexto").textContent = jogador.online ? "Online" : "Offline";
  }

  const NOME_RESULTADO = { vitoria: "Vitoria", derrota: "Derrota", empate: "Empate" };
  const CLASSE_RESULTADO = { vitoria: "win", derrota: "loss", empate: "draw" };

  function montarHistorico(jogador, partidas) {
    const corpoTabela = document.getElementById("historicoCorpo");
    for (const partida of partidas) {
      const linha = criar("tr", "card__row");

      // Jogadores: e o cabecalho da linha (o leitor de tela repete nas outras celulas)
      const jogadores = criar("th", "card__cell card__cell_type_players");
      jogadores.scope = "row";
      const versus = criar("span", "card__versus", "x");
      versus.setAttribute("aria-hidden", "true");
      jogadores.append(
        criarJogador(jogador),
        " ",
        versus,
        criar("span", "visually-hidden", "contra"),
        " ",
        criarJogador(partida.adversario)
      );

      const celulaResultado = criar("td", "card__cell");
      const resultado = criar(
        "span",
        "card__result card__result_value_" + CLASSE_RESULTADO[partida.resultado],
        NOME_RESULTADO[partida.resultado]
      );
      resultado.append(" ", criar("span", "card__score", partida.placar));
      celulaResultado.append(resultado);

      const celulaPrecisao = criar("td", "card__cell", partida.precisao + "%");

      const celulaData = criar("td", "card__cell");
      const data = criar("time", "card__date", dataCurta(partida.data));
      data.dateTime = partida.data;
      celulaData.append(data);

      linha.append(jogadores, celulaResultado, celulaPrecisao, celulaData);
      corpoTabela.append(linha);
    }
  }

  function montarLiga(jogador, liga) {
    document.getElementById("ligaNome").textContent = liga.nome;

    const lista = document.getElementById("ligaLista");
    liga.top3.forEach(function (pessoa, indice) {
      const item = criar("li", "card__rank-item");
      if (pessoa.nick === jogador.nick) item.classList.add("card__rank-item_state_current");
      // a <ol> ja anuncia a posicao; o numero visivel fica so para os olhos
      const posicao = criar("span", "card__rank-position", indice + 1 + ".");
      posicao.setAttribute("aria-hidden", "true");
      item.append(
        posicao,
        " ",
        criar("span", "card__rank-name", pessoa.nick),
        " ",
        criar("span", "card__rank-points", pessoa.pontos + " pts")
      );
      lista.append(item);
    });

    document.getElementById("ligaPosicao").textContent =
      "Sua posicao: " + liga.posicaoJogador + " de " + liga.totalJogadores +
      " (" + liga.pontosJogador + " pts)";
  }

  function montarTemas(temas) {
    const lista = document.getElementById("temasLista");
    for (const tema of temas) {
      const item = criar("li", "card__theme");
      if (!tema.liberado) item.classList.add("card__theme_state_locked");

      // A miniatura e decorativa: o nome do tema esta escrito ao lado
      const imagem = criar("img", "card__theme-image");
      imagem.src = tema.imagem;
      imagem.alt = "";
      imagem.width = 96;
      imagem.height = 72;
      item.append(imagem, criar("span", "card__theme-name", tema.nome));

      if (tema.liberado) {
        item.append(criar("span", "card__theme-status visually-hidden", "liberado"));
      } else {
        const cadeado = criar("img", "card__theme-lock");
        cadeado.src = "./images/icone-cadeado.svg";
        cadeado.alt = "";
        cadeado.width = 16;
        cadeado.height = 16;
        item.append(
          cadeado,
          criar("span", "card__theme-status visually-hidden", "bloqueado, libera com " + tema.criterio)
        );
      }
      lista.append(item);
    }
  }

  // ------------------------------------------------------------ barra lateral

  // Liga e desliga as classes conforme o tamanho da tela e as escolhas
  function aplicarEstado() {
    const celular = CELULAR.matches;
    if (!celular) menuAberto = false; // menu so existe no celular

    barra.classList.toggle("sidebar_state_collapsed", recolhida && !celular);
    corpo.classList.toggle("page_sidebar_collapsed", recolhida && !celular);
    botaoRecolher.setAttribute("aria-expanded", String(!recolhida));

    barra.classList.toggle("sidebar_state_open", menuAberto);
    corpo.classList.toggle("page_menu_open", menuAberto);
    botaoMenu.setAttribute("aria-expanded", String(menuAberto));

    // Menu fechado no celular: os links saem do Tab e do leitor de tela
    barra.inert = celular && !menuAberto;

    // Menu aberto funciona como janela modal: o resto da pagina sai do Tab
    // e do leitor de tela. No computador menuAberto e sempre false.
    for (const parte of atrasDoMenu) parte.inert = menuAberto;
  }

  // Botoes e links do menu que aparecem na tela, mais o botao de menu no fim
  function focaveisDoMenu() {
    const itens = Array.from(barra.querySelectorAll("a[href], button:not([disabled])"));
    const visiveis = itens.filter(function (item) {
      return item.getClientRects().length > 0;
    });
    visiveis.push(botaoMenu);
    return visiveis;
  }

  function abrirMenu() {
    menuAberto = true;
    aplicarEstado();
    const primeiroLink = barra.querySelector(".sidebar__link");
    if (primeiroLink) primeiroLink.focus();
  }

  function fecharMenu(devolverFoco) {
    if (!menuAberto) return;
    menuAberto = false;
    aplicarEstado();
    if (devolverFoco) botaoMenu.focus();
  }

  function ligarBarra() {
    try {
      recolhida = localStorage.getItem(CHAVE_RECOLHIDA) === "sim";
    } catch (erro) {
      // sem localStorage: comeca aberta
    }

    botaoRecolher.addEventListener("click", function () {
      recolhida = !recolhida;
      aplicarEstado();
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, recolhida ? "sim" : "nao");
      } catch (erro) {
        // nao deu para guardar: vale so ate fechar a pagina
      }
    });

    botaoMenu.addEventListener("click", function () {
      if (menuAberto) fecharMenu(true);
      else abrirMenu();
    });

    // Escolheu um item do menu: fecha e o foco volta para o botao
    barra.addEventListener("click", function (evento) {
      if (menuAberto && evento.target.closest("a")) fecharMenu(true);
    });

    // Esc fecha o menu. Tab e Shift+Tab giram dentro do menu (o foco nao sai
    // para a barra do navegador): do ultimo vai ao primeiro e vice-versa
    document.addEventListener("keydown", function (evento) {
      if (!menuAberto) return;
      if (evento.key === "Escape") {
        fecharMenu(true);
        return;
      }
      if (evento.key !== "Tab") return;
      const focaveis = focaveisDoMenu();
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    });

    // Clique fora da barra (e fora do botao) fecha o menu
    document.addEventListener("click", function (evento) {
      if (!menuAberto) return;
      if (barra.contains(evento.target) || botaoMenu.contains(evento.target)) return;
      fecharMenu(true);
    });

    // O foco saiu do menu pelo Tab (foi para o jogo): fecha sem puxar o foco
    document.addEventListener("focusin", function (evento) {
      if (!menuAberto) return;
      if (barra.contains(evento.target) || evento.target === botaoMenu) return;
      fecharMenu(false);
    });

    // Passou de celular para computador (ou o contrario): reaplica
    CELULAR.addEventListener("change", aplicarEstado);

    aplicarEstado();
  }

  // ------------------------------------------------------------ inicio

  ligarBarra();

  if (typeof DADOS_EXEMPLO === "undefined") return; // sem dados: so a barra funciona
  montarPerfil(DADOS_EXEMPLO.jogador);
  montarHistorico(DADOS_EXEMPLO.jogador, DADOS_EXEMPLO.historico);
  montarLiga(DADOS_EXEMPLO.jogador, DADOS_EXEMPLO.liga);
  montarTemas(DADOS_EXEMPLO.temas);
})();
