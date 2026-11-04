const words = [
  { word: "CAFÉ", category: "ALIMENTOS", hint: "Uma bebida quente que ajuda a acordar." },
  { word: "JACARÉ", category: "ANIMAIS", hint: "Um grande réptil que vive perto da água." },
  { word: "VIOLÃO", category: "MÚSICA", hint: "Instrumento de cordas usado em rodas de música." },
  { word: "ABACAXI", category: "FRUTAS", hint: "Uma fruta tropical com coroa." },
  { word: "BRASIL", category: "PAÍSES", hint: "Maior país da América do Sul." },
  { word: "ESTRELA", category: "ESPAÇO", hint: "Corpo celeste que brilha à noite." },
  { word: "PIRATA", category: "PERSONAGENS", hint: "Navegador famoso por procurar tesouros." },
  { word: "BICICLETA", category: "TRANSPORTES", hint: "Veículo movido pelos pedais." }
];

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const maxErrors = 6;
let currentWord;
let guessedLetters;
let errors;
let hintShown;
let soundEnabled = false;

const wordElement = document.getElementById("word");
const categoryElement = document.getElementById("category");
const hintElement = document.getElementById("hint");
const keyboardElement = document.getElementById("keyboard");
const mistakesElement = document.getElementById("mistakes");
const dialog = document.getElementById("resultDialog");

function normalizeLetter(letter) {
  return letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function newGame() {
  currentWord = words[Math.floor(Math.random() * words.length)];
  guessedLetters = new Set();
  errors = 0;
  hintShown = false;
  dialog.close();
  categoryElement.textContent = currentWord.category;
  hintElement.textContent = "";
  document.querySelectorAll(".figure-part, .face").forEach(part => part.classList.remove("visible"));
  document.querySelectorAll(".key").forEach(key => {
    key.disabled = false;
    key.classList.remove("correct", "wrong");
  });
  renderWord();
  updateMistakes();
  document.querySelector(".key:not([disabled])")?.focus();
}

function renderWord() {
  wordElement.replaceChildren();
  [...currentWord.word].forEach(character => {
    const slot = document.createElement("span");
    slot.className = "letter-slot";
    if (character === " ") {
      slot.style.borderColor = "transparent";
      slot.textContent = " ";
    } else {
      const normalized = normalizeLetter(character);
      slot.textContent = guessedLetters.has(normalized) ? character : "";
    }
    wordElement.append(slot);
  });

  wordElement.setAttribute("aria-label", [...currentWord.word].map(character => {
    if (character === " ") return "espaço";
    return guessedLetters.has(normalizeLetter(character)) ? character : "letra ocultada";
  }).join(", "));
}

function makeKeyboard() {
  [...alphabet].forEach(letter => {
    const button = document.createElement("button");
    button.className = "key";
    button.type = "button";
    button.textContent = letter;
    button.dataset.letter = letter;
    button.setAttribute("aria-label", `Letra ${letter}`);
    button.addEventListener("click", () => guess(letter));
    keyboardElement.append(button);
  });
}

function guess(letter) {
  if (guessedLetters.has(letter) || dialog.open || errors >= maxErrors) return;
  const normalizedWord = normalizeLetter(currentWord.word);
  const button = document.querySelector(`[data-letter="${letter}"]`);
  guessedLetters.add(letter);
  button.disabled = true;

  if (normalizedWord.includes(letter)) {
    button.classList.add("correct");
    playTone(520);
  } else {
    errors += 1;
    button.classList.add("wrong");
    showBodyPart(errors - 1);
    playTone(180);
  }

  renderWord();
  updateMistakes();
  checkResult();
}

function showBodyPart(index) {
  const part = document.querySelector(`.figure-part[data-part="${index}"]`);
  if (part) part.classList.add("visible");
  if (index === maxErrors - 1) document.querySelector(".face").classList.add("visible");
}

function updateMistakes() {
  mistakesElement.textContent = `${errors} / ${maxErrors} erros`;
}

function checkResult() {
  const normalizedWord = normalizeLetter(currentWord.word);
  const lettersInWord = new Set(normalizedWord.replace(/[^A-Z]/g, ""));
  const won = [...lettersInWord].every(letter => guessedLetters.has(letter));

  if (won) {
    showResult(true);
  } else if (errors >= maxErrors) {
    showResult(false);
  }
}

function showResult(won) {
  document.getElementById("dialogIcon").textContent = won ? "✓" : "×";
  document.getElementById("dialogTitle").textContent = won ? "Você venceu!" : "Fim de jogo";
  document.getElementById("dialogMessage").textContent = won
    ? `Você descobriu a palavra ${currentWord.word}.`
    : `A palavra era ${currentWord.word}.`;
  dialog.showModal();
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

document.getElementById("hintButton").addEventListener("click", () => {
  hintShown = !hintShown;
  hintElement.textContent = hintShown ? currentWord.hint : "";
});

document.getElementById("newButton").addEventListener("click", newGame);
document.getElementById("dialogButton").addEventListener("click", newGame);
document.getElementById("soundButton").addEventListener("click", event => {
  soundEnabled = !soundEnabled;
  event.currentTarget.setAttribute("aria-pressed", String(soundEnabled));
  event.currentTarget.setAttribute("aria-label", soundEnabled ? "Desativar som" : "Ativar som");
});

document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey || dialog.open) return;
  const letter = normalizeLetter(event.key).toUpperCase();
  if (/^[A-Z]$/.test(letter)) guess(letter);
});

const dustCanvas = document.getElementById("dustCanvas");
const dustContext = dustCanvas.getContext("2d");
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

window.addEventListener("resize", resizeDust);
document.addEventListener("pointermove", event => {
  const x = (event.clientX / window.innerWidth - .5) * 14;
  const y = (event.clientY / window.innerHeight - .5) * 8;
  document.querySelector(".mesa-left").style.transform = `translate(${x * -0.25}px, ${y * -0.2}px)`;
  document.querySelector(".mesa-right").style.transform = `translate(${x * -0.4}px, ${y * -0.2}px) scale(.75)`;
  document.querySelector(".western-sun").style.transform = `translate(${-x}px, ${-y}px)`;
  document.querySelector(".game-shell").style.transform = `rotateY(${x * 0.14}deg) rotateX(${-y * 0.12}deg)`;
  document.querySelector(".hangman").style.transform = `rotateY(${-8 + x * 0.35}deg) rotateX(${2 - y * 0.25}deg)`;
});
resizeDust();
animateDust();

makeKeyboard();
newGame();
