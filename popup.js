const KEY = "wtDarkEnabled";
const toggle = document.getElementById("toggle");

chrome.storage.sync.get({ [KEY]: true }, (data) => { toggle.checked = data[KEY]; });
toggle.addEventListener("change", () => chrome.storage.sync.set({ [KEY]: toggle.checked }));
