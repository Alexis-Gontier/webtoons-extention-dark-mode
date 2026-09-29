const KEY = "wtDarkEnabled";
const BG_KEY = "wtBg";
const DEFAULT_BG = "#171717";

const PRESETS = [
  { name: "Doux", color: "#171717" },
  { name: "OLED", color: "#000000" },
  { name: "Anthracite", color: "#242424" },
  { name: "Nuit", color: "#121826" },
  { name: "Ardoise", color: "#1b2230" },
  { name: "Sépia", color: "#211b14" },
  { name: "Forêt", color: "#131d17" },
  { name: "Prune", color: "#1d1624" },
];

const toggle = document.getElementById("toggle");
const settings = document.getElementById("settings");
const palette = document.getElementById("palette");
const custom = document.getElementById("custom");
const customHex = document.getElementById("customHex");
const customRow = custom.closest(".custom");

for (const { name, color } of PRESETS) {
  const btn = document.createElement("button");
  btn.className = "option";
  btn.setAttribute("role", "radio");
  btn.dataset.color = color;
  btn.title = color === DEFAULT_BG ? `${name} (${color}, par défaut)` : `${name} (${color})`;
  const swatch = document.createElement("span");
  swatch.className = "swatch";
  swatch.style.background = color;
  btn.append(swatch, name);
  btn.addEventListener("click", () => save(color));
  palette.append(btn);
}

let state = { enabled: true, color: DEFAULT_BG };

function render() {
  const { enabled, color } = state;
  toggle.checked = enabled;
  settings.classList.toggle("off", !enabled);
  document.documentElement.style.setProperty("--bg", color);
  const isPreset = PRESETS.some((p) => p.color === color);
  for (const btn of palette.children) {
    btn.setAttribute("aria-checked", String(btn.dataset.color === color));
    btn.tabIndex = -1;
  }
  // Un seul point d'arrêt Tab dans la grille (l'option active), les flèches font le reste.
  (palette.querySelector('[aria-checked="true"]') || palette.firstElementChild).tabIndex = 0;
  customRow.classList.toggle("selected", !isPreset);
  if (!isPreset) custom.value = color;
  customHex.textContent = isPreset ? "Choisir une couleur" : color;
}

palette.addEventListener("keydown", (e) => {
  const options = [...palette.children];
  const i = options.indexOf(document.activeElement);
  if (i < 0) return;
  const cols = 4;
  const next = {
    ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols,
    Home: 0, End: options.length - 1,
  }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  const target = options[(next + options.length) % options.length];
  target.focus();
  target.click();
});

function save(color) {
  state.color = color;
  render();
  chrome.storage.sync.set({ [BG_KEY]: color });
}

chrome.storage.sync.get({ [KEY]: true, [BG_KEY]: DEFAULT_BG }, (data) => {
  state = { enabled: data[KEY], color: data[BG_KEY] };
  render();
});

toggle.addEventListener("change", () => {
  state.enabled = toggle.checked;
  render();
  chrome.storage.sync.set({ [KEY]: state.enabled });
});

// Aperçu en direct pendant le choix, enregistrement à la validation (quota d'écriture de storage.sync).
custom.addEventListener("input", () => {
  document.documentElement.style.setProperty("--bg", custom.value);
  customHex.textContent = custom.value;
  customRow.classList.add("selected");
});
custom.addEventListener("change", () => save(custom.value));
