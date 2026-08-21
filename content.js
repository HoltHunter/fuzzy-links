(() => {
  if (window.__fuzzyLinksInstalled) return;
  window.__fuzzyLinksInstalled = true;

  const state = {
    open: false,
    mode: "search",
    candidates: [],
    results: [],
    selectedIndex: 0,
    navCandidates: [],
    navSelectedIndex: 0,
    host: null,
    shadow: null,
    input: null,
    list: null,
    panel: null,
    footerMode: null,
    modeBadge: null,
    count: null,
    resultsVisible: false,
    highlightedEl: null,
    highlightedOriginal: null,
    hoveredEl: null,
    scrollRefreshTimer: null,
    hoverRefreshTimer: null,
    navSequence: "",
    navSequenceTimer: null,
    helpVisible: false,
    help: null,
    selectedLabel: null,
    hint: null,
    activationShortcut: "Ctrl+Space",
  };

  const MAX_RESULTS = 8;
  const SCROLL_STEP = 120;
  const DIRECTION_EPSILON_PX = 3;
  const NAV_SEQUENCE_TIMEOUT_MS = 650;
  const HOVER_RESCAN_DELAY_MS = 120;
  const ACTIVATION_RESCAN_DELAY_MS = 80;
  const ACTIVATION_SETTLE_RESCAN_DELAY_MS = 260;
  const SESSION_STORAGE_KEY = "__fuzzyLinksSessionV212";

  function normalizeShortcutKey(key) {
    if (key === " ") return "Space";
    if (key === "Escape") return "Esc";
    if (key.length === 1) return key.toUpperCase();
    return key;
  }

  function parseShortcut(shortcut) {
    const parts = String(shortcut || "Ctrl+Space").split("+").map((part) => part.trim()).filter(Boolean);
    const spec = { ctrl: false, alt: false, shift: false, meta: false, key: "" };
    for (const part of parts) {
      const p = part.toLowerCase();
      if (p === "ctrl" || p === "control") spec.ctrl = true;
      else if (p === "alt") spec.alt = true;
      else if (p === "shift") spec.shift = true;
      else if (p === "meta" || p === "cmd" || p === "command") spec.meta = true;
      else spec.key = part;
    }
    return spec;
  }

  function matchesActivationShortcut(event) {
    const spec = parseShortcut(state.activationShortcut);
    if (!spec.key) return false;
    return event.ctrlKey === spec.ctrl &&
      event.altKey === spec.alt &&
      event.shiftKey === spec.shift &&
      event.metaKey === spec.meta &&
      normalizeShortcutKey(event.key).toLowerCase() === normalizeShortcutKey(spec.key).toLowerCase();
  }

  function loadActivationShortcut() {
    chrome.storage.sync.get({ activationShortcut: "Ctrl+Space" }, (items) => {
      state.activationShortcut = items.activationShortcut || "Ctrl+Space";
      updateShortcutUi();
    });
  }

  function updateShortcutUi() {
    if (!state.shadow) return;
    state.shadow.querySelectorAll("[data-activation-shortcut]").forEach((node) => {
      node.textContent = state.activationShortcut;
    });
  }

  function normalize(text) {
    return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function candidateSignature(candidate) {
    const el = candidate?.el;
    if (!el) return null;
    return {
      kind: candidate.kind || kindForElement(el),
      label: normalize(candidate.displayText || rawLabel(el)),
      id: el.id || "",
      name: el.getAttribute?.("name") || "",
      role: el.getAttribute?.("role") || "",
      href: candidate.url || "",
    };
  }

  function signatureScore(candidate, signature) {
    if (!candidate || !signature) return -Infinity;
    const el = candidate.el;
    let score = 0;
    if (signature.id && el.id === signature.id) score += 10000;
    if (signature.href && candidate.url === signature.href) score += 5000;
    if (signature.name && el.getAttribute?.("name") === signature.name) score += 1500;
    if (signature.role && el.getAttribute?.("role") === signature.role) score += 500;
    if (signature.kind && candidate.kind === signature.kind) score += 250;
    const label = normalize(candidate.displayText || rawLabel(el));
    if (signature.label && label === signature.label) score += 3000;
    else if (signature.label && label.includes(signature.label)) score += 700;
    return score;
  }

  function findBestSignatureIndex(candidates, signature) {
    if (!signature || !candidates?.length) return -1;
    let bestIndex = -1;
    let bestScore = -Infinity;
    candidates.forEach((candidate, index) => {
      const score = signatureScore(candidate, signature);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestScore > 0 ? bestIndex : -1;
  }

  function saveSessionState() {
    try {
      if (!state.open) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      const payload = {
        open: true,
        mode: state.mode,
        query: "",
        resultsVisible: !!state.resultsVisible,
        selected: candidateSignature(selectedCandidate()),
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function clearSavedSession() {
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch (_) {}
  }

  function readSavedSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.open ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function rawLabel(el) {
    const labelledBy = el.getAttribute?.("aria-labelledby");
    if (labelledBy) {
      const labelText = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
      if (labelText) return labelText;
    }

    if (el instanceof HTMLInputElement) {
      const type = (el.type || "text").toLowerCase();
      const associated = Array.from(el.labels || []).map((label) => label.innerText || label.textContent || "").join(" ").trim();
      if (associated) return associated;
      if (["button", "submit", "reset"].includes(type) && el.value) return el.value;
      return el.getAttribute("aria-label") || el.placeholder || el.getAttribute("title") || el.name || type;
    }

    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      const associated = Array.from(el.labels || []).map((label) => label.innerText || label.textContent || "").join(" ").trim();
      if (associated) return associated;
      return el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("title") || el.getAttribute("name") || "";
    }

    return (
      el.innerText ||
      el.textContent ||
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("alt") ||
      el.getAttribute("name") ||
      ""
    );
  }

  function candidateUrl(el) {
    if (el instanceof HTMLAnchorElement && el.href) return el.href;
    return "";
  }

  function isPotentiallyInteractive(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.matches("a[href], button, input:not([type='hidden']), textarea, select, summary, label[for], [contenteditable='true'], [role='button'], [role='link'], [role='menuitem'], [role='tab'], [role='checkbox'], [role='radio'], [role='switch'], [role='option'], [role='textbox'], [aria-haspopup], [onclick], [tabindex]:not([tabindex='-1'])")) {
      return true;
    }

    if (el instanceof HTMLInputElement) return (el.type || "text").toLowerCase() !== "hidden";

    return false;
  }

  function isVisibleInteractive(el) {
    if (!isPotentiallyInteractive(el)) return false;
    if (el.matches(":disabled, [disabled], [aria-disabled='true']")) return false;

    const style = getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0 ||
      el.closest('[aria-hidden="true"]')
    ) {
      return false;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    return (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < innerHeight &&
      rect.left < innerWidth
    );
  }

  function kindForElement(el) {
    if (el instanceof HTMLAnchorElement || el.getAttribute("role") === "link") return "link";
    if (el instanceof HTMLInputElement) return el.type || "input";
    if (el instanceof HTMLTextAreaElement) return "textarea";
    if (el.isContentEditable) return "editor";
    if (el.tagName === "SELECT") return "select";
    if (el.tagName === "SUMMARY") return "summary";
    return "button";
  }

  function collectVisibleCandidates() {
    const selector = [
      "a[href]",
      "button",
      "input:not([type='hidden'])",
      "textarea",
      "select",
      "summary",
      "label[for]",
      "[contenteditable='true']",
      "[role='button']",
      "[role='link']",
      "[role='menuitem']",
      "[role='tab']",
      "[role='checkbox']",
      "[role='radio']",
      "[role='switch']",
      "[role='option']",
      "[role='textbox']",
      "[aria-haspopup]",
      "[onclick]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const seen = new Set();
    const candidates = [];

    for (const el of document.querySelectorAll(selector)) {
      if (!isVisibleInteractive(el)) continue;

      const url = candidateUrl(el);
      const displayText = rawLabel(el).replace(/\s+/g, " ").trim();
      const text = normalize(displayText || url || kindForElement(el));
      if (!text && !url) continue;

      if (seen.has(el)) continue;
      seen.add(el);

      candidates.push({
        el,
        url,
        text,
        displayText: displayText || url || `[${kindForElement(el)}]`,
        kind: kindForElement(el),
      });
    }

    // Remove nested/duplicate interactive wrappers that occupy essentially the same
    // on-screen rectangle. These otherwise make spatial NAV feel sticky.
    const deduped = [];
    for (const candidate of candidates) {
      const r = candidate.el.getBoundingClientRect();
      const duplicate = deduped.find((other) => {
        const o = other.el.getBoundingClientRect();
        return Math.abs(r.left - o.left) < 2 && Math.abs(r.top - o.top) < 2 &&
               Math.abs(r.right - o.right) < 2 && Math.abs(r.bottom - o.bottom) < 2;
      });
      if (!duplicate) deduped.push(candidate);
    }

    return deduped;
  }

  function fuzzyScore(query, candidate) {
    const q = normalize(query);
    const c = normalize(candidate);
    if (!q) return 0;
    if (!c) return -Infinity;

    const direct = c.indexOf(q);
    if (direct !== -1) return 10000 - direct * 10 - (c.length - q.length);

    let qi = 0;
    let score = 0;
    let previousMatch = -2;
    let firstMatch = -1;

    for (let ci = 0; ci < c.length && qi < q.length; ci++) {
      if (c[ci] !== q[qi]) continue;
      if (firstMatch === -1) firstMatch = ci;
      score += 20;
      if (ci === previousMatch + 1) score += 15;
      if (ci === 0 || /[\s\-_/.:]/.test(c[ci - 1])) score += 10;
      score -= ci * 0.08;
      previousMatch = ci;
      qi++;
    }

    if (qi !== q.length) return -Infinity;
    score -= firstMatch * 1.5;
    score -= (c.length - q.length) * 0.12;
    return score;
  }

  function rankCandidates(query) {
    if (!query.trim()) return state.candidates.slice();

    return state.candidates
      .map((candidate) => {
        const textScore = fuzzyScore(query, candidate.text);
        const urlScore = candidate.url ? fuzzyScore(query, candidate.url) - 25 : -Infinity;
        return { ...candidate, score: Math.max(textScore, urlScore) };
      })
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort((a, b) => b.score - a.score);
  }

  function clearPageHighlight() {
    if (!state.highlightedEl || !state.highlightedOriginal) return;
    const el = state.highlightedEl;
    const original = state.highlightedOriginal;
    el.style.outline = original.outline;
    el.style.outlineOffset = original.outlineOffset;
    el.style.backgroundColor = original.backgroundColor;
    el.style.borderRadius = original.borderRadius;
    state.highlightedEl = null;
    state.highlightedOriginal = null;
  }

  function dispatchHover(el, entering) {
    const events = entering
      ? ["pointerover", "pointerenter", "mouseover", "mouseenter"]
      : ["pointerout", "pointerleave", "mouseout", "mouseleave"];

    for (const type of events) {
      const Ctor = type.startsWith("pointer") && window.PointerEvent ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ctor(type, {
        bubbles: !type.endsWith("enter") && !type.endsWith("leave"),
        cancelable: true,
        composed: true,
        view: window,
      }));
    }
  }

  function clearHoverPreview() {
    clearTimeout(state.hoverRefreshTimer);
    if (!state.hoveredEl?.isConnected) {
      state.hoveredEl = null;
      return;
    }
    dispatchHover(state.hoveredEl, false);
    state.hoveredEl = null;
  }

  function applyHoverPreview(candidate) {
    const el = candidate?.el;
    if (!el?.isConnected || state.hoveredEl === el) return;

    clearHoverPreview();
    state.hoveredEl = el;
    dispatchHover(el, true);

    if (state.mode === "nav" && typeof el.focus === "function" && !(el instanceof HTMLInputElement) && !(el instanceof HTMLSelectElement)) {
      try { el.focus({ preventScroll: true }); } catch (_) {}
    } else if (state.mode === "search" && state.input && state.shadow?.activeElement !== state.input) {
      try { state.input.focus({ preventScroll: true }); } catch (_) { state.input.focus(); }
    }

    state.hoverRefreshTimer = setTimeout(() => {
      if (!state.open) return;
      if (state.mode === "nav") {
        refreshNavCandidates();
      } else {
        const before = state.candidates.length;
        state.candidates = collectVisibleCandidates();
        if (state.candidates.length !== before) updateResults(false);
      }
    }, HOVER_RESCAN_DELAY_MS);
  }

  function highlightPageCandidate(candidate) {
    clearPageHighlight();
    if (!candidate?.el?.isConnected) return;

    const el = candidate.el;
    state.highlightedOriginal = {
      outline: el.style.outline,
      outlineOffset: el.style.outlineOffset,
      backgroundColor: el.style.backgroundColor,
      borderRadius: el.style.borderRadius,
    };
    state.highlightedEl = el;
    el.style.outline = "3px solid #ffb300";
    el.style.outlineOffset = "3px";
    el.style.backgroundColor = "rgba(255, 179, 0, 0.16)";
    el.style.borderRadius = "3px";

    applyHoverPreview(candidate);
    updateStatus(candidate);
  }

  function updateStatus(candidate = selectedCandidate()) {
    if (!state.selectedLabel || !state.hint) return;
    if (candidate) {
      const text = (candidate.displayText || candidate.kind || "control").replace(/\s+/g, " ").trim();
      state.selectedLabel.textContent = `${candidate.kind.toUpperCase()} · ${text}`;
      state.selectedLabel.title = text;
    } else {
      state.selectedLabel.textContent = "No selectable control";
      state.selectedLabel.title = "";
    }
    state.hint.textContent = state.mode === "search"
      ? "↑↓ / C-jk select · Enter open · S-Enter tab · C-Space NAV · C-. list · C-/ help"
      : "hjkl move · 0/$ row edge · gg/G/tt/T corners · C-hjkl scroll · C-d/u half · / search · r rescan · ? help";
  }

  function createUi() {
    if (state.host) return;

    const host = document.createElement("div");
    host.id = "fuzzy-links-extension-host";
    host.style.all = "initial";
    host.style.position = "fixed";
    host.style.zIndex = "2147483647";
    host.style.bottom = "0";
    host.style.left = "0";

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .panel {
          position: fixed;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: min(620px, calc(100vw - 24px));
          color: #f5f7fa;
          background: rgba(20, 23, 28, 0.94);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 9px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.35);
          overflow: hidden;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          backdrop-filter: blur(8px);
        }
        .bar {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 6px 9px;
        }
        .modeBadge {
          flex: 0 0 auto;
          padding: 4px 6px;
          border-radius: 5px;
          color: #ffca4b;
          background: rgba(255, 179, 0, 0.14);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .prompt { color: #ffb300; font-weight: 800; }
        .queryBox {
          flex: 1;
          display: flex;
          align-items: center;
          min-width: 0;
          padding: 4px 7px;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
        }
        input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: 14px;
          caret-color: #ffb300;
        }
        input::placeholder { color: #68717d; }
        .count { color: #929aa5; font-size: 10px; white-space: nowrap; }
        .statusRow { display:flex; align-items:center; gap:10px; padding:0 9px 6px; min-width:0; }
        .selectedLabel { flex:1; min-width:0; color:#c9d1d9; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .hint { flex:0 1 auto; color: #7f8792; font-size: 9px; white-space: nowrap; overflow:hidden; text-overflow:ellipsis; }
        .help { display:none; padding:10px 12px; border-top:1px solid rgba(255,255,255,.09); background:rgba(15,18,22,.98); font-size:10px; line-height:1.65; }
        .panel.showHelp .help { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:2px 18px; }
        .help b { color:#ffca4b; }
        .help span { color:#aab2bd; }
        .results {
          display: none;
          max-height: 42vh;
          overflow: hidden;
          padding: 5px;
          border-top: 1px solid rgba(255,255,255,0.09);
          background: rgba(15, 18, 22, 0.97);
        }
        .panel.showResults .results { display: block; }
        .item {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
          padding: 7px 8px;
          border-radius: 6px;
          min-height: 34px;
        }
        .item.selected {
          background: rgba(255, 179, 0, 0.15);
          outline: 1px solid rgba(255, 179, 0, 0.58);
        }
        .index { color: #ffb300; text-align: right; }
        .title { color: #f5f7fa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .meta { color: #7f8792; font-size: 10px; white-space: nowrap; }
        .empty { padding: 12px; color: #929aa5; text-align: center; font-size: 11px; }
        .panel.navMode .modeBadge { color: #90caf9; background: rgba(100,181,246,0.14); }
        .panel.navMode .queryBox { opacity: 0.55; }
        kbd { color: #c9d1d9; font-family: inherit; }
      </style>
      <div class="panel">
        <div class="bar">
          <span class="modeBadge">SEARCH</span>
          <span class="prompt">›</span>
          <div class="queryBox">
            <input spellcheck="false" autocomplete="off" placeholder="fuzzy find visible controls…" />
          </div>
          <span class="count"></span>
        </div>
        <div class="statusRow">
          <span class="selectedLabel">No selectable control</span>
          <span class="hint"></span>
        </div>
        <div class="help">
          <span><b data-activation-shortcut>Ctrl+Space</b> open / toggle SEARCH↔NAV</span><span><b>Esc</b> close</span>
          <span><b>Enter</b> activate selected</span><span><b>Shift+Enter</b> open link in new tab</span>
          <span><b>SEARCH ↑↓ / Ctrl+jk</b> choose result</span><span><b>Ctrl+.</b> show/hide result list</span>
          <span><b>NAV hjkl</b> spatial move</span><span><b>0 / $</b> left/right edge of current row</span>
          <span><b>gg / G</b> top/bottom-left</span><span><b>tt / T</b> top/bottom-right</span>
          <span><b>Ctrl+hjkl</b> fine scroll</span><span><b>Ctrl+d/u</b> half-page down/up</span>
          <span><b>/</b> fresh QUERY</span><span><b>r</b> rescan controls · <b>?</b> help · <b>Ctrl+,</b> settings</span>
        </div>
        <div class="results"></div>
      </div>
    `;

    document.documentElement.appendChild(host);

    state.host = host;
    state.shadow = shadow;
    state.panel = shadow.querySelector(".panel");
    state.input = shadow.querySelector("input");
    updateShortcutUi();
    state.list = shadow.querySelector(".results");
    state.modeBadge = shadow.querySelector(".modeBadge");
    state.count = shadow.querySelector(".count");
    state.selectedLabel = shadow.querySelector(".selectedLabel");
    state.hint = shadow.querySelector(".hint");
    state.help = shadow.querySelector(".help");

    state.input.addEventListener("input", () => {
      state.selectedIndex = 0;
      updateResults();
    });
  }

  function renderResults() {
    const start = Math.max(
      0,
      Math.min(
        Math.max(0, state.results.length - MAX_RESULTS),
        state.selectedIndex - Math.floor(MAX_RESULTS / 2)
      )
    );
    const shown = state.results.slice(start, start + MAX_RESULTS);
    const selectedLocalIndex = state.selectedIndex - start;
    state.list.replaceChildren();

    if (!shown.length) {
      if (state.resultsVisible) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No matching visible controls";
        state.list.appendChild(empty);
      }
      clearPageHighlight();
      clearHoverPreview();
      updateStatus(null);
      return;
    }

    if (state.resultsVisible) {
      shown.forEach((candidate, i) => {
        const item = document.createElement("div");
        item.className = `item${i === selectedLocalIndex ? " selected" : ""}`;

        const index = document.createElement("div");
        index.className = "index";
        index.textContent = String(start + i + 1);

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = candidate.displayText;

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = candidate.kind;

        item.append(index, title, meta);
        state.list.appendChild(item);
      });
    }

    highlightPageCandidate(selectedCandidate());
  }

  function updateResults(keepSelection = true) {
    const query = state.input?.value || "";
    state.results = rankCandidates(query);

    if (!keepSelection) {
      const selectedEl = state.highlightedEl;
      const idx = state.results.findIndex((candidate) => candidate.el === selectedEl);
      if (idx >= 0) state.selectedIndex = idx;
    }

    const maxIndex = state.results.length - 1;
    state.selectedIndex = Math.max(0, Math.min(state.selectedIndex, Math.max(0, maxIndex)));
    state.count.textContent = `${state.results.length}/${state.candidates.length}`;
    renderResults();
    saveSessionState();
  }

  function refreshVisibleCandidates() {
    if (!state.open) return;
    if (state.mode === "nav") {
      refreshNavCandidates();
      return;
    }
    state.candidates = collectVisibleCandidates();
    updateResults(false);
  }

  function refreshNavCandidates() {
    if (!state.open || state.mode !== "nav") return;

    const selectedEl = state.navCandidates[state.navSelectedIndex]?.el || state.highlightedEl;
    state.navCandidates = collectVisibleCandidates();

    const preservedIndex = state.navCandidates.findIndex((candidate) => candidate.el === selectedEl);
    if (preservedIndex >= 0) {
      state.navSelectedIndex = preservedIndex;
    } else {
      state.navSelectedIndex = Math.max(0, Math.min(state.navSelectedIndex, Math.max(0, state.navCandidates.length - 1)));
    }

    state.count.textContent = `${state.navCandidates.length} visible`;
    highlightPageCandidate(selectedCandidate());
  }

  function selectDelta(delta) {
    const resultCount = state.results.length;
    if (!resultCount) return;
    state.selectedIndex = (state.selectedIndex + delta + resultCount) % resultCount;
    renderResults();
  }

  function candidateRect(candidate) {
    const rect = candidate?.el?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return rect;
  }

  function intervalGap(aStart, aEnd, bStart, bEnd) {
    if (aEnd < bStart) return bStart - aEnd;
    if (bEnd < aStart) return aStart - bEnd;
    return 0;
  }

  function spatialMove(direction) {
    const current = selectedCandidate();
    const origin = candidateRect(current);
    if (!origin) return;

    const originCx = origin.left + origin.width / 2;
    const originCy = origin.top + origin.height / 2;
    let bestIndex = -1;
    let bestScore = Infinity;

    state.navCandidates.forEach((candidate, index) => {
      if (index === state.navSelectedIndex || !candidate?.el?.isConnected) return;
      const rect = candidateRect(candidate);
      if (!rect) return;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let primaryGap;
      let crossGap;
      let centerPrimary;

      switch (direction) {
        case "left":
          // The candidate must actually lie to the left of the current control's center.
          if (cx >= originCx - DIRECTION_EPSILON_PX) return;
          primaryGap = Math.max(0, origin.left - rect.right);
          crossGap = intervalGap(origin.top, origin.bottom, rect.top, rect.bottom);
          centerPrimary = originCx - cx;
          break;
        case "right":
          if (cx <= originCx + DIRECTION_EPSILON_PX) return;
          primaryGap = Math.max(0, rect.left - origin.right);
          crossGap = intervalGap(origin.top, origin.bottom, rect.top, rect.bottom);
          centerPrimary = cx - originCx;
          break;
        case "up":
          if (cy >= originCy - DIRECTION_EPSILON_PX) return;
          primaryGap = Math.max(0, origin.top - rect.bottom);
          crossGap = intervalGap(origin.left, origin.right, rect.left, rect.right);
          centerPrimary = originCy - cy;
          break;
        case "down":
          if (cy <= originCy + DIRECTION_EPSILON_PX) return;
          primaryGap = Math.max(0, rect.top - origin.bottom);
          crossGap = intervalGap(origin.left, origin.right, rect.left, rect.right);
          centerPrimary = cy - originCy;
          break;
        default:
          return;
      }

      // Measure actual rectangle-to-rectangle proximity first. If controls overlap on
      // the cross axis, crossGap is zero. A small center-distance tie breaker makes
      // movement deterministic for overlapping/nested controls without overpowering
      // physical proximity.
      const edgeDistance = Math.hypot(primaryGap, crossGap);
      const score = edgeDistance * 1000 + centerPrimary;

      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0) {
      state.navSelectedIndex = bestIndex;
      highlightPageCandidate(selectedCandidate());
    }
  }

  function jumpRowEdge(side) {
    if (!state.navCandidates.length) return;
    const current = selectedCandidate();
    const origin = candidateRect(current);
    if (!origin) return;

    const originCy = origin.top + origin.height / 2;
    const rowCandidates = state.navCandidates
      .map((candidate, index) => ({ candidate, index, rect: candidateRect(candidate) }))
      .filter(({ rect }) => rect && intervalGap(origin.top, origin.bottom, rect.top, rect.bottom) === 0);

    const pool = rowCandidates.length > 1 ? rowCandidates : state.navCandidates
      .map((candidate, index) => ({ candidate, index, rect: candidateRect(candidate) }))
      .filter(({ rect }) => rect && Math.abs((rect.top + rect.height / 2) - originCy) <= Math.max(48, origin.height * 2));

    if (!pool.length) return;
    pool.sort((a, b) => {
      const ax = side === "left" ? a.rect.left : -a.rect.right;
      const bx = side === "left" ? b.rect.left : -b.rect.right;
      if (ax !== bx) return ax - bx;
      return Math.abs((a.rect.top + a.rect.height / 2) - originCy) - Math.abs((b.rect.top + b.rect.height / 2) - originCy);
    });
    state.navSelectedIndex = pool[0].index;
    highlightPageCandidate(selectedCandidate());
  }

  function toggleHelp() {
    state.helpVisible = !state.helpVisible;
    state.panel?.classList.toggle("showHelp", state.helpVisible);
  }

  function canScrollElement(el, axis) {
    if (!(el instanceof HTMLElement)) return false;
    const style = getComputedStyle(el);
    if (axis === "y") {
      const overflow = style.overflowY;
      return /(auto|scroll|overlay)/.test(overflow) && el.scrollHeight > el.clientHeight + 1;
    }
    const overflow = style.overflowX;
    return /(auto|scroll|overlay)/.test(overflow) && el.scrollWidth > el.clientWidth + 1;
  }

  function scrollContainerForCandidate(candidate, axis) {
    let el = candidate?.el?.parentElement || null;
    while (el && el !== document.body && el !== document.documentElement) {
      if (canScrollElement(el, axis)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function activeScrollTarget(axis) {
    const local = scrollContainerForCandidate(selectedCandidate(), axis);
    return local || window;
  }

  function performScroll(target, options) {
    if (target === window) window.scrollBy({ ...options, behavior: "instant" });
    else target.scrollBy({ ...options, behavior: "instant" });

    // Local scroll containers do not reliably trigger the window scroll handler.
    // Refresh explicitly after layout settles so newly visible controls join NAV.
    clearTimeout(state.scrollRefreshTimer);
    state.scrollRefreshTimer = setTimeout(() => {
      if (state.open && state.mode === "nav") refreshNavCandidates();
      else if (state.open) refreshVisibleCandidates();
    }, 40);
  }

  function scrollPage(amount) {
    const target = activeScrollTarget("y");
    performScroll(target, { top: amount });
  }

  function pageScrollAmount(direction, fraction) {
    const target = activeScrollTarget("y");
    const viewport = target === window ? innerHeight : target.clientHeight;
    performScroll(target, { top: direction * Math.max(120, viewport * fraction) });
  }

  function jumpToCorner(corner) {
    if (!state.navCandidates.length) return;

    const target = {
      "top-left": { x: 0, y: 0 },
      "top-right": { x: innerWidth, y: 0 },
      "bottom-left": { x: 0, y: innerHeight },
      "bottom-right": { x: innerWidth, y: innerHeight },
    }[corner];
    if (!target) return;

    let bestIndex = -1;
    let bestDistance = Infinity;
    state.navCandidates.forEach((candidate, index) => {
      const rect = candidateRect(candidate);
      if (!rect) return;
      const x = corner.includes("right") ? rect.right : rect.left;
      const y = corner.includes("bottom") ? rect.bottom : rect.top;
      const distance = Math.hypot(x - target.x, y - target.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0) {
      state.navSelectedIndex = bestIndex;
      highlightPageCandidate(selectedCandidate());
    }
  }

  function clearNavSequence() {
    clearTimeout(state.navSequenceTimer);
    state.navSequenceTimer = null;
    state.navSequence = "";
  }

  function armNavSequence(prefix) {
    clearNavSequence();
    state.navSequence = prefix;
    if (state.hint) state.hint.textContent = prefix === "g" ? "g… press g → top-left" : "t… press t → top-right";
    state.navSequenceTimer = setTimeout(() => { clearNavSequence(); updateStatus(); }, NAV_SEQUENCE_TIMEOUT_MS);
  }

  function selectedCandidate() {
    if (state.mode === "nav") return state.navCandidates[state.navSelectedIndex] || null;
    return state.results[state.selectedIndex] || null;
  }

  function refreshAfterActivation(expectedMode) {
    if (!state.open || state.mode !== expectedMode) return;

    if (state.mode === "nav") {
      refreshNavCandidates();
      return;
    }

    // Preserve the current SEARCH query while incorporating controls revealed by
    // the activation.
    state.candidates = collectVisibleCandidates();
    updateResults(false);

    // Clicking a page control usually moves DOM focus away from the query. Reclaim
    // it so the user can continue typing immediately.
    if (state.input) {
      try { state.input.focus({ preventScroll: true }); }
      catch (_) { state.input.focus(); }
    }
  }

  function scheduleActivationRefresh(expectedMode) {
    // Menus may render synchronously or on a later framework task. A fast rescan
    // plus a short settle rescan catches both cases.
    setTimeout(() => refreshAfterActivation(expectedMode), ACTIVATION_RESCAN_DELAY_MS);
    setTimeout(() => refreshAfterActivation(expectedMode), ACTIVATION_SETTLE_RESCAN_DELAY_MS);
  }

  function activateSelected(newTab) {
    const candidate = selectedCandidate();
    if (!candidate?.el?.isConnected) return;

    const el = candidate.el;
    const url = candidate.url;
    const activationMode = state.mode;

    // Keep Fuzzy Links open. A true page navigation/reload will naturally unload
    // this content script; in-page menus, dialogs, accordions, and SPA changes will
    // leave the current QUERY/NAV session intact.
    if (newTab && url) {
      chrome.runtime.sendMessage({ type: "FUZZY_LINKS_OPEN_NEW_TAB", url });
      scheduleActivationRefresh(activationMode);
      return;
    }

    // Preserve the page's native click behavior, including JS handlers and link
    // attributes such as target/download.
    try {
      el.click();
    } catch (_) {
      if (url) location.assign(url);
    }

    scheduleActivationRefresh(activationMode);
  }

  function setMode(mode) {
    const previousMode = state.mode;
    const startingEl = previousMode === "search" ? state.results[state.selectedIndex]?.el : null;

    state.mode = mode;
    const isQuery = mode === "search";
    if (state.modeBadge) state.modeBadge.textContent = isQuery ? "QUERY" : "NAV · HJKL SELECT";
    state.panel?.classList.toggle("navMode", !isQuery);
    clearNavSequence();
    updateStatus();

    if (isQuery) {
      if (state.input) state.input.value = "";
      state.selectedIndex = 0;
      state.candidates = collectVisibleCandidates();
      updateResults();
      state.input?.focus();
      saveSessionState();
      return;
    }

    state.resultsVisible = false;
    state.panel?.classList.remove("showResults");
    state.list?.replaceChildren();
    state.navCandidates = collectVisibleCandidates();
    const anchorIndex = state.navCandidates.findIndex((candidate) => candidate.el === startingEl);
    state.navSelectedIndex = anchorIndex >= 0 ? anchorIndex : 0;
    state.count.textContent = `${state.navCandidates.length} visible`;
    state.input?.blur();
    highlightPageCandidate(selectedCandidate());
    saveSessionState();
  }

  function restoreSavedSession(saved) {
    if (!saved?.open) return false;

    createUi();
    state.open = true;
    state.resultsVisible = false;
    state.helpVisible = false;
    state.host.style.display = "block";
    state.panel.classList.remove("showResults", "showHelp", "navMode");

    state.mode = "search";
    state.modeBadge.textContent = "QUERY";
    state.input.value = "";
    state.selectedIndex = 0;
    state.candidates = collectVisibleCandidates();
    state.results = rankCandidates("");
    state.count.textContent = `${state.results.length}/${state.candidates.length}`;
    renderResults();
    state.input.focus();

    updateStatus();
    saveSessionState();
    return true;
  }

  function toggleResults() {
    if (state.mode !== "search") return;
    state.resultsVisible = !state.resultsVisible;
    state.panel?.classList.toggle("showResults", state.resultsVisible);
    renderResults();
  }

  function openFinder() {
    createUi();
    state.open = true;
    state.resultsVisible = false;
    state.helpVisible = false;
    state.host.style.display = "block";
    state.panel.classList.remove("showResults", "showHelp");
    state.selectedIndex = 0;
    state.input.value = "";
    setMode("search");
    state.input.focus();
    saveSessionState();
  }

  function closeFinder() {
    if (!state.open) return;
    state.open = false;
    clearSavedSession();
    clearPageHighlight();
    clearHoverPreview();
    state.helpVisible = false;
    state.panel?.classList.remove("showHelp");
    if (state.host) state.host.style.display = "none";
  }

  function handleCommand() {
    if (!state.open) {
      openFinder();
      return;
    }
    setMode(state.mode === "search" ? "nav" : "search");
  }

  function scrollByKey(key) {
    const horizontal = key === "h" || key === "l";
    const target = activeScrollTarget(horizontal ? "x" : "y");
    switch (key) {
      case "h": performScroll(target, { left: -SCROLL_STEP }); break;
      case "j": performScroll(target, { top: SCROLL_STEP }); break;
      case "k": performScroll(target, { top: -SCROLL_STEP }); break;
      case "l": performScroll(target, { left: SCROLL_STEP }); break;
    }
  }

  window.addEventListener("pagehide", () => saveSessionState());

  document.addEventListener("keydown", (event) => {
    if (matchesActivationShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
      handleCommand();
      return;
    }

    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && event.key === ",") {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage({ type: "FUZZY_LINKS_OPEN_SETTINGS" });
      return;
    }

    if (!state.open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (state.mode === "search") setMode("nav");
      else closeFinder();
      return;
    }

    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && event.key === ".") {
      event.preventDefault();
      event.stopPropagation();
      toggleResults();
      return;
    }

    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && event.key === "/") {
      event.preventDefault();
      event.stopPropagation();
      toggleHelp();
      return;
    }

    if (state.mode === "nav") {
      const key = event.key.toLowerCase();

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        clearNavSequence();
        activateSelected(event.shiftKey);
        return;
      }

      if (!event.ctrlKey && !event.altKey && !event.metaKey && event.key === "/") {
        event.preventDefault();
        event.stopPropagation();
        setMode("search");
        return;
      }

      if (!event.ctrlKey && !event.altKey && !event.metaKey && event.key === "?") {
        event.preventDefault();
        event.stopPropagation();
        toggleHelp();
        return;
      }

      if (!event.ctrlKey && !event.altKey && !event.metaKey && key === "r") {
        event.preventDefault();
        event.stopPropagation();
        clearNavSequence();
        refreshNavCandidates();
        return;
      }

      if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && (key === "d" || key === "u")) {
        event.preventDefault();
        event.stopPropagation();
        clearNavSequence();
        pageScrollAmount(key === "d" ? 1 : -1, 0.5);
        return;
      }

      if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && (key === "f" || key === "b")) {
        event.preventDefault();
        event.stopPropagation();
        clearNavSequence();
        pageScrollAmount(key === "f" ? 1 : -1, 0.9);
        return;
      }

      if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && ["h", "j", "k", "l"].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        clearNavSequence();
        scrollByKey(key);
        return;
      }

      if (!event.ctrlKey && !event.altKey && !event.metaKey) {
        if (event.key === "0") {
          event.preventDefault();
          event.stopPropagation();
          clearNavSequence();
          jumpRowEdge("left");
          return;
        }
        if (event.key === "$") {
          event.preventDefault();
          event.stopPropagation();
          clearNavSequence();
          jumpRowEdge("right");
          return;
        }

        // Single-key corner jumps. Case matters for G/T.
        if (event.key === "G") {
          event.preventDefault();
          event.stopPropagation();
          clearNavSequence();
          jumpToCorner("bottom-left");
          return;
        }
        if (event.key === "T") {
          event.preventDefault();
          event.stopPropagation();
          clearNavSequence();
          jumpToCorner("bottom-right");
          return;
        }

        // Two-key corner jumps.
        if (state.navSequence === "g" && key === "g") {
          event.preventDefault();
          event.stopPropagation();
          clearNavSequence();
          jumpToCorner("top-left");
          return;
        }
        if (state.navSequence === "t" && key === "t") {
          event.preventDefault();
          event.stopPropagation();
          clearNavSequence();
          jumpToCorner("top-right");
          return;
        }
        if (key === "g" || key === "t") {
          event.preventDefault();
          event.stopPropagation();
          armNavSequence(key);
          return;
        }

        if (["h", "j", "k", "l"].includes(key)) {
          event.preventDefault();
          event.stopPropagation();
          clearNavSequence();
          const direction = { h: "left", l: "right", j: "down", k: "up" }[key];
          spatialMove(direction);
          return;
        }
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      selectDelta(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      activateSelected(event.shiftKey);
      return;
    }

    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === "j" || key === "k") {
        event.preventDefault();
        event.stopPropagation();
        selectDelta(key === "j" ? 1 : -1);
      }
    }
  }, true);

  window.addEventListener("scroll", () => {
    if (!state.open) return;
    clearTimeout(state.scrollRefreshTimer);
    state.scrollRefreshTimer = setTimeout(refreshVisibleCandidates, 80);
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (state.open) refreshVisibleCandidates();
  }, { passive: true });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.activationShortcut) {
      state.activationShortcut = changes.activationShortcut.newValue || "Ctrl+Space";
      updateShortcutUi();
    }
  });

  loadActivationShortcut();

  const savedSession = readSavedSession();
  if (savedSession) {
    // Delay one task so document_idle pages/frameworks can finish their immediate
    // mount work before candidate restoration.
    setTimeout(() => restoreSavedSession(savedSession), 0);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "FUZZY_LINKS_TOGGLE") handleCommand();
  });
})();
