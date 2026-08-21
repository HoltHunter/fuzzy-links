const DEFAULT_SHORTCUT = "Ctrl+Space";
const input = document.getElementById("shortcut");
const save = document.getElementById("save");
const reset = document.getElementById("reset");
const status = document.getElementById("status");
let pending = DEFAULT_SHORTCUT;

function keyName(event) {
  if (event.key === " ") return "Space";
  if (event.key === "Escape") return "Esc";
  if (event.key.length === 1) return event.key.toUpperCase();
  return event.key;
}

function eventToShortcut(event) {
  const key = keyName(event);
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return null;
  const parts = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  if (!parts.length) return { error: "Use at least one modifier key." };
  parts.push(key);
  return { value: parts.join("+") };
}

function show(message, error = false) {
  status.textContent = message;
  status.style.color = error ? "#f85149" : "#3fb950";
}

input.addEventListener("keydown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  const result = eventToShortcut(event);
  if (!result) return;
  if (result.error) {
    show(result.error, true);
    return;
  }
  pending = result.value;
  input.value = pending;
  show("Press Save to apply.");
});

input.addEventListener("click", () => {
  input.focus();
  show("Press your new shortcut now.");
});

save.addEventListener("click", () => {
  chrome.storage.sync.set({ activationShortcut: pending }, () => {
    show(`Saved: ${pending}`);
  });
});

reset.addEventListener("click", () => {
  pending = DEFAULT_SHORTCUT;
  input.value = pending;
  chrome.storage.sync.set({ activationShortcut: pending }, () => {
    show(`Reset to ${DEFAULT_SHORTCUT}`);
  });
});

chrome.storage.sync.get({ activationShortcut: DEFAULT_SHORTCUT }, (items) => {
  pending = items.activationShortcut || DEFAULT_SHORTCUT;
  input.value = pending;
});
