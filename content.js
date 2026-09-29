const KEY = "wtDarkEnabled";
const BG_KEY = "wtBg";
const DEFAULT_BG = "#171717";
const root = document.documentElement;

// La page entière passe par invert(1) (voir dark.css). Chaque couleur qu'on veut voir à l'écran
// doit donc être écrite « pré-inversée » : pré = 255 - couleur voulue. Tout reste dans le gamut,
// ce qui garantit que les planches ré-inversées gardent exactement leurs couleurs.

// Conteneurs ré-inversés par dark.css : leur contenu s'affiche tel quel, on n'y touche pas.
const REINVERTED = "img, picture, video, canvas, iframe, [style*='background-image'], [data-wt-picture], #toolbar.tool_area";
const CHROMA_MIN = 40;
const OVERRIDES = ["wtBg", "wtFg", "wtFill", "wtStroke", "wtBorder"];

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const parse = (s) => {
  const m = s.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
  return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
};
const chroma = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
const isLight = (c) => Math.min(c[0], c[1], c[2]) >= 200;
const preInverted = (final, alpha) => `rgba(${final.map((v) => clamp(255 - v)).join(", ")}, ${alpha})`;

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hslToRgb([h, s, l]) {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return 255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

// Couleur vive de l'interface : on inverse sa luminosité mais on garde sa teinte (le vert reste vert).
function darkVariant(c) {
  const [h, s, l] = rgbToHsl(c);
  return preInverted(hslToRgb([h, s, 1 - l]), c[3]);
}

let pageColor = hexToRgb(DEFAULT_BG);

// Fonds clairs : le blanc devient la couleur de page choisie, les gris clairs s'en écartent
// d'autant qu'ils s'écartaient du blanc, et une légère teinte est conservée. À la limite (canaux à 200),
// on retombe sur l'inversion simple pour éviter une cassure.
function lightBackground(c) {
  const k = (Math.min(c[0], c[1], c[2]) - 200) / 55;
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const final = [0, 1, 2].map((i) => k * (pageColor[i] + (255 - lum) + 0.3 * (c[i] - lum)) + (1 - k) * (255 - c[i]));
  return preInverted(final, c[3]);
}

const backgroundFor = (c) => (isLight(c) ? lightBackground(c) : darkVariant(c));

function setBackground(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) hex = DEFAULT_BG;
  pageColor = hexToRgb(hex);
  root.style.setProperty("--wt-page", preInverted(pageColor, 1));
  // La barre de défilement n'est pas filtrée : couleurs finales directes.
  root.style.setProperty("--wt-track", hex);
  root.style.setProperty("--wt-thumb", `rgb(${pageColor.map((v) => clamp(v + (255 - v) * 0.22)).join(", ")})`);
  for (const el of document.querySelectorAll("[data-wt-bg]")) {
    el.style.setProperty("--wt-bg", backgroundFor(el.dataset.wtBg.split(",").map(Number)));
  }
  try { localStorage.setItem(BG_KEY, hex); } catch {}
}

const INHERITABLE = [
  ["color", "wtFg", "--wt-fg"],
  ["fill", "wtFill", "--wt-fill"],
  ["stroke", "wtStroke", "--wt-stroke"],
];

// Grande image de fond : affichée telle quelle (ré-inversée). Petite (icône, sprite) : luminosité
// inversée comme le texte mais teinte conservée, pour qu'une icône noire reste visible sur fond sombre.
const imageKind = (width, height) => (width * height > 64 * 64 ? "picture" : "sprite");
const EMOJI = /\p{Extended_Pictographic}/u;

function mark(el, s) {
  if (s.backgroundImage.includes("url(")) {
    const { width, height } = el.getBoundingClientRect();
    if (width && height) el.setAttribute(`data-wt-${imageKind(width, height)}`, "");
    if (imageKind(width, height) === "picture") return;
  }
  for (const pseudo of ["before", "after"]) {
    const ps = getComputedStyle(el, `::${pseudo}`);
    if (ps.content === "none" || !ps.backgroundImage.includes("url(")) continue;
    const width = parseFloat(ps.width), height = parseFloat(ps.height);
    if (width && height) el.setAttribute(`data-wt-${imageKind(width, height)}-${pseudo}`, "");
  }

  // Les emojis sont du texte en couleur : sans correction, l'inversion change leur teinte (cœur rose → turquoise).
  if ([...el.childNodes].some((n) => n.nodeType === 3 && EMOJI.test(n.data))) {
    el.setAttribute("data-wt-emoji", "");
    return;
  }

  const bg = parse(s.backgroundColor);
  if (bg && bg[3] > 0 && (isLight(bg) || chroma(bg) >= CHROMA_MIN)) {
    el.dataset.wtBg = bg.join(",");
    el.style.setProperty("--wt-bg", backgroundFor(bg));
  }

  // color, fill et stroke s'héritent : si la valeur vient du parent, elle est déjà compensée.
  const parent = el.parentElement && getComputedStyle(el.parentElement);
  for (const [prop, key, cssVar] of INHERITABLE) {
    const value = s[prop];
    if (prop !== "color" && value === s.color) continue; // currentColor
    if (parent && parent[prop] === value) continue;
    const c = parse(value);
    if (!c || c[3] === 0 || chroma(c) < CHROMA_MIN) continue;
    el.dataset[key] = "";
    el.style.setProperty(cssVar, darkVariant(c));
  }

  if (s.borderTopStyle !== "none" && s.borderTopColor !== s.color) {
    const c = parse(s.borderTopColor);
    if (c && c[3] > 0 && chroma(c) >= CHROMA_MIN) {
      el.dataset.wtBorder = "";
      el.style.setProperty("--wt-border", darkVariant(c));
    }
  }
}

function evaluate(el) {
  if (el.closest(REINVERTED) || el.closest("[data-wt-emoji]")) return;
  const wasMarked = OVERRIDES.some((k) => k in el.dataset);
  if (!wasMarked) return mark(el, getComputedStyle(el));

  // Réévaluation : on retire nos surcharges pour relire les couleurs du site. Les transitions sont
  // coupées le temps de la lecture, sinon on lirait une valeur intermédiaire (et on animerait nos changements).
  const prev = [el.style.getPropertyValue("transition"), el.style.getPropertyPriority("transition")];
  el.style.setProperty("transition", "none", "important");
  for (const k of OVERRIDES) delete el.dataset[k];
  const s = getComputedStyle(el);
  mark(el, s);
  void s.color; // applique nos surcharges pendant que les transitions sont coupées
  if (prev[0]) el.style.setProperty("transition", prev[0], prev[1]);
  else el.style.removeProperty("transition");
}

function scan(node) {
  if (node.nodeType !== 1) return;
  evaluate(node);
  for (const el of node.querySelectorAll("*")) evaluate(el);
}

// Lecture synchrone pour éviter le flash au chargement, puis confirmation via chrome.storage.
function apply(enabled) {
  root.classList.toggle("wt-dark", enabled);
  try { localStorage.setItem(KEY, enabled ? "1" : "0"); } catch {}
}

let cachedEnabled = null, cachedBg = null;
try { cachedEnabled = localStorage.getItem(KEY); cachedBg = localStorage.getItem(BG_KEY); } catch {}
apply(cachedEnabled !== "0");
setBackground(cachedBg || DEFAULT_BG);

chrome.storage.sync.get({ [KEY]: true, [BG_KEY]: DEFAULT_BG }, (data) => {
  apply(data[KEY]);
  if (data[BG_KEY] !== (cachedBg || DEFAULT_BG)) setBackground(data[BG_KEY]);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (KEY in changes) apply(changes[KEY].newValue);
  if (BG_KEY in changes) setBackground(changes[BG_KEY].newValue);
});

// Nouveaux éléments et changements d'état (onglet sélectionné, bouton actif…), qui peuvent changer
// les couleurs via des sélecteurs CSS du site.
const STATE_ATTRIBUTES = [
  "class", "aria-selected", "aria-checked", "aria-current", "aria-pressed", "aria-expanded",
  "selected", "checked", "disabled", "open", "hidden",
];
const pending = new Set();
let scheduled = false;
new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === "attributes") pending.add(m.target);
    else for (const n of m.addedNodes) pending.add(n);
  }
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const nodes = [...pending];
    pending.clear();
    // Parents d'abord : un enfant hérite des couleurs déjà compensées de son parent.
    for (const n of nodes) {
      if (n.isConnected && !nodes.some((o) => o !== n && o.contains(n))) scan(n);
    }
  });
}).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: STATE_ATTRIBUTES });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => scan(document.body));
} else {
  scan(document.body);
}
