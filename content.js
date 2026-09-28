const KEY = "wtDarkEnabled";
const root = document.documentElement;

function apply(enabled) {
  root.classList.toggle("wt-dark", enabled);
  try { localStorage.setItem(KEY, enabled ? "1" : "0"); } catch {}
}

// Lecture synchrone pour éviter le flash blanc au chargement, puis confirmation via chrome.storage.
let cached = null;
try { cached = localStorage.getItem(KEY); } catch {}
apply(cached !== "0");

chrome.storage.sync.get({ [KEY]: true }, (data) => apply(data[KEY]));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && KEY in changes) apply(changes[KEY].newValue);
});

// Grise légèrement les fonds très clairs (200–255 → 200–232) : une fois inversés, ils deviennent
// un gris très foncé plutôt que du noir pur. Les images ne sont pas concernées.
const soften = (c) => (c < 200 ? c : Math.round(200 + (c - 200) * (32 / 55)));

function softenBackground(el) {
  if (el.hasAttribute("data-wt-bg")) return;
  const m = getComputedStyle(el).backgroundColor.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
  if (!m || m[4] === "0") return;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  if (r < 200 || g < 200 || b < 200) return;
  const a = m[4] ?? "1";
  el.style.setProperty("--wt-bg", `rgba(${soften(r)}, ${soften(g)}, ${soften(b)}, ${a})`);
  el.setAttribute("data-wt-bg", "");
}

function scan(node) {
  if (node.nodeType !== 1) return;
  softenBackground(node);
  for (const el of node.querySelectorAll("*")) softenBackground(el);
}

const pending = new Set();
let scheduled = false;
new MutationObserver((mutations) => {
  for (const m of mutations) for (const n of m.addedNodes) pending.add(n);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    for (const n of pending) if (n.isConnected) scan(n);
    pending.clear();
  });
}).observe(root, { childList: true, subtree: true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => scan(document.body));
} else {
  scan(document.body);
}
