// Jogo da Forca — cliente.
//
// Este arquivo NAO sabe qual e a palavra. Ele guarda apenas o que o servidor
// ja revelou. Toda decisao de acerto, erro e fim de jogo acontece nas Functions
// em /api, contra o banco D1.

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const estado = {
  partidaId: null,
  tamanho: 0,
  reveladas: [],      // posicao -> caractere, ou null enquanto escondido
  erros: 0,
  maxErros: 6,
  situacao: 'em_andamento',
  definicao: null,    // dica textual da palavra, quando o dicionario tem
  dicaVisivel: false,
  ocupado: false      // evita dois cliques dispararem duas requisicoes
};

let autenticado = false;
let soundEnabled = false;

const wordElement = document.getElementById('word');
const categoryElement = document.getElementById('category');
const hintElement = document.getElementById('hint');
const keyboardElement = document.getElementById('keyboard');
const mistakesElement = document.getElementById('mistakes');
const dialog = document.getElementById('resultDialog');
const hintButton = document.getElementById('hintButton');
const newButton = document.getElementById('newButton');

function normalizeLetter(letter) {
  return letter.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function pedir(caminho, corpo) {
  const resposta = await fetch(caminho, {
    method: 'POST',
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw Object.assign(new Error(dados.erro || 'Falha'), { status: resposta.status });
  return dados;
}

// ----------------------------------------------------------------- sessao

async function carregarUsuario() {
  try {
    const dados = await (await fetch('/api/auth/eu')).json();
    autenticado = dados.autenticado === true;
    if (autenticado) {
      const primeiro = (dados.nome || dados.email || 'Jogador').split(' ')[0];
      categoryElement.textContent = `JOGADOR: ${primeiro.toUpperCase()}`;
    } else {
      categoryElement.replaceChildren();
      const entrar = document.createElement('a');
      entrar.href = '/api/auth/login';
      entrar.textContent = 'ENTRAR COM GOOGLE';
      categoryElement.append(entrar);
    }
  } catch {
    autenticado = false;
    categoryElement.textContent = 'SERVIDOR INDISPONIVEL';
  }
  return autenticado;
}

// ------------------------------------------------------------------- tela

function renderWord() {
  wordElement.replaceChildren();
  estado.reveladas.forEach(caractere => {
    const slot = document.createElement('span');
    slot.className = 'letter-slot';
    slot.textContent = caractere ?? '';
    wordElement.append(slot);
  });

  wordElement.setAttribute(
    'aria-label',
    estado.reveladas.map(c => c ?? 'letra ocultada').join(', ')
  );
}

function updateMistakes() {
  mistakesElement.textContent = `${estado.erros} / ${estado.maxErros} erros`;
}

function showBodyPart(index) {
  const part = document.querySelector(`.figure-part[data-part="${index}"]`);
  if (part) part.classList.add('visible');
  if (index === estado.maxErros - 1) document.querySelector('.face').classList.add('visible');
}

function sincronizarBoneco() {
  for (let i = 0; i < estado.erros; i++) showBodyPart(i);
}

function travarTeclado(travado) {
  document.querySelectorAll('.key').forEach(key => {
    if (travado) key.disabled = true;
  });
  hintButton.disabled = travado;
}

function showResult(venceu, palavra) {
  document.getElementById('dialogIcon').textContent = venceu ? '✓' : '×';
  document.getElementById('dialogTitle').textContent = venceu ? 'Você venceu!' : 'Fim de jogo';
  document.getElementById('dialogMessage').textContent = venceu
    ? `Você descobriu a palavra ${palavra}.`
    : `A palavra era ${palavra}.`;
  dialog.showModal();
}

// ------------------------------------------------------------------ jogo

async function newGame() {
  if (!autenticado && !(await carregarUsuario())) {
    hintElement.textContent = 'Entre com sua conta Google para jogar.';
    return;
  }

  try {
    const partida = await pedir('/api/partida');
    estado.partidaId = partida.partidaId;
    estado.tamanho = partida.tamanho;
    estado.maxErros = partida.maxErros;
    estado.reveladas = Array(partida.tamanho).fill(null);
    estado.erros = 0;
    estado.situacao = 'em_andamento';
    estado.definicao = partida.definicao;
    estado.dicaVisivel = false;
  } catch (erro) {
    hintElement.textContent = erro.message;
    return;
  }

  if (dialog.open) dialog.close();
  hintElement.textContent = '';
  document.querySelectorAll('.figure-part, .face').forEach(p => p.classList.remove('visible'));
  document.querySelectorAll('.key').forEach(key => {
    key.disabled = false;
    key.classList.remove('correct', 'wrong');
  });
  hintButton.disabled = false;

  renderWord();
  updateMistakes();
  document.querySelector('.key:not([disabled])')?.focus();
}

function aplicarResposta(resposta, botao) {
  if (resposta.acertou) {
    for (const { posicao, caractere } of resposta.reveladas) {
      estado.reveladas[posicao] = caractere;
    }
    botao?.classList.add('correct');
    playTone(520);
  } else {
    botao?.classList.add('wrong');
    playTone(180);
  }

  estado.erros = resposta.erros;
  estado.situacao = resposta.situacao;

  renderWord();
  updateMistakes();
  sincronizarBoneco();

  if (resposta.situacao !== 'em_andamento') {
    travarTeclado(true);
    showResult(resposta.situacao === 'vitoria', resposta.palavra);
  }
}

async function guess(letter) {
  if (estado.ocupado || !estado.partidaId) return;
  if (estado.situacao !== 'em_andamento' || dialog.open) return;

  const botao = document.querySelector(`[data-letter="${letter}"]`);
  if (botao?.disabled) return;

  estado.ocupado = true;
  if (botao) botao.disabled = true;

  try {
    aplicarResposta(await pedir('/api/chute', { partidaId: estado.partidaId, letra: letter }), botao);
  } catch (erro) {
    // Se o servidor recusou, devolve o botao: a letra nao foi gasta.
    if (botao && erro.status !== 409) botao.disabled = false;
    hintElement.textContent = erro.message;
  } finally {
    estado.ocupado = false;
  }
}

// A Dica mostra o que a palavra significa. Nao custa erro e nao revela letra:
// e a mesma ideia do jogo original, so que o texto vem do dicionario em vez de
// ter sido escrito a mao.
function mostrarDica() {
  if (estado.situacao !== 'em_andamento') return;

  if (!estado.definicao) {
    hintElement.textContent = 'Esta palavra nao tem dica no dicionario.';
    return;
  }

  estado.dicaVisivel = !estado.dicaVisivel;
  hintElement.textContent = estado.dicaVisivel ? estado.definicao : '';
}

function makeKeyboard() {
  [...alphabet].forEach(letter => {
    const button = document.createElement('button');
    button.className = 'key';
    button.type = 'button';
    button.textContent = letter;
    button.dataset.letter = letter;
    button.setAttribute('aria-label', `Letra ${letter}`);
    button.addEventListener('click', () => guess(letter));
    keyboardElement.append(button);
  });
}

function playTone(frequency) {
  if (!soundEnabled) return;
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.05;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.08);
}

hintButton.addEventListener('click', mostrarDica);
newButton.addEventListener('click', newGame);
document.getElementById('dialogButton').addEventListener('click', newGame);
document.getElementById('soundButton').addEventListener('click', event => {
  soundEnabled = !soundEnabled;
  event.currentTarget.setAttribute('aria-pressed', String(soundEnabled));
  event.currentTarget.setAttribute('aria-label', soundEnabled ? 'Desativar som' : 'Ativar som');
});

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || dialog.open) return;
  const letter = normalizeLetter(event.key).toUpperCase();
  if (/^[A-Z]$/.test(letter)) guess(letter);
});

// --------------------------------------------------------- cenario (visual)

const dustCanvas = document.getElementById('dustCanvas');
const dustContext = dustCanvas.getContext('2d');
let dustParticles = [];

function resizeDust() {
  const scale = window.devicePixelRatio || 1;
  dustCanvas.width = window.innerWidth * scale;
  dustCanvas.height = window.innerHeight * scale;
  dustCanvas.style.width = `${window.innerWidth}px`;
  dustCanvas.style.height = `${window.innerHeight}px`;
  dustContext.setTransform(scale, 0, 0, scale, 0, 0);
  dustParticles = Array.from({ length: Math.min(90, window.innerWidth / 14) }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 2 + .4,
    speed: Math.random() * .18 + .05,
    drift: Math.random() * 1.2 - .6,
    alpha: Math.random() * .3 + .08
  }));
}

function animateDust() {
  dustContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
  dustParticles.forEach(particle => {
    particle.x += particle.drift;
    particle.y -= particle.speed;
    if (particle.y < -5) particle.y = window.innerHeight + 5;
    if (particle.x < -5) particle.x = window.innerWidth + 5;
    if (particle.x > window.innerWidth + 5) particle.x = -5;
    dustContext.beginPath();
    dustContext.fillStyle = `rgba(255, 231, 181, ${particle.alpha})`;
    dustContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    dustContext.fill();
  });
  requestAnimationFrame(animateDust);
}

window.addEventListener('resize', resizeDust);
document.addEventListener('pointermove', event => {
  const x = (event.clientX / window.innerWidth - .5) * 14;
  const y = (event.clientY / window.innerHeight - .5) * 8;
  document.querySelector('.mesa-left').style.transform = `translate(${x * -0.25}px, ${y * -0.2}px)`;
  document.querySelector('.mesa-right').style.transform = `translate(${x * -0.4}px, ${y * -0.2}px) scale(.75)`;
  document.querySelector('.western-sun').style.transform = `translate(${-x}px, ${-y}px)`;
  document.querySelector('.game-shell').style.transform = `rotateY(${x * 0.14}deg) rotateX(${-y * 0.12}deg)`;
  document.querySelector('.hangman').style.transform = `rotateY(${-8 + x * 0.35}deg) rotateX(${2 - y * 0.25}deg)`;
});
resizeDust();
animateDust();

// ------------------------------------------------------------------ inicio

makeKeyboard();
carregarUsuario().then(ok => { if (ok) newGame(); });
