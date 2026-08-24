# Fuzzy Links for Microsoft Edge — v2.5.0

Fuzzy Links is a keyboard-first page navigator for Microsoft Edge. It fuzzy-searches visible interactive controls and provides a spatial NAV mode for moving around the current viewport without a mouse.

## Install

1. Extract the extension folder.
2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the `edge-fuzzy-links` folder.
5. Open the extension's **Options** page to change the activation shortcut if desired.

Default activation shortcut: **Ctrl+Space**. You can also press **Ctrl+,** on a normal webpage to open Fuzzy Links settings.

## Core workflow

- **Activation shortcut** (default **Ctrl+Space**): open the extension in SEARCH mode. While open, toggle SEARCH ↔ NAV.
- **Esc**: close.
- **Enter**: activate the selected control and keep Fuzzy Links open if the page remains loaded.
- **Shift+Enter**: open a selected link in a new tab without closing the current Fuzzy Links session.

### SEARCH mode

- Type normally to fuzzy-filter currently visible controls.
- **Arrow Up/Down** or **Ctrl+k / Ctrl+j**: move through fuzzy matches.
- **Ctrl+.**: show/hide the results list.
- **Ctrl+/**: show/hide the keyboard help panel.
- Returning to SEARCH always clears the previous query.

### NAV mode

NAV starts at the fuzzy result that was selected when you entered NAV, then ignores the fuzzy filter and navigates all visible interactive controls.

- **h / j / k / l**: move left / down / up / right spatially.
- **0 / $**: jump to the leftmost / rightmost control in the current visual row.
- **gg / G**: jump to the top-left / bottom-left control.
- **tt / T**: jump to the top-right / bottom-right control.
- **Ctrl+h/j/k/l**: fine-scroll left/down/up/right.
- **Ctrl+d / Ctrl+u**: half-page down/up.
- **Ctrl+f / Ctrl+b**: nearly full-page down/up.
- **/**: immediately return to a fresh SEARCH query.
- **r**: manually rescan visible controls (useful after dynamic page changes).
- **?** or **Ctrl+/**: show/hide keyboard help.

## v2.0 upgrades

- Broader control detection: links, buttons, menus, tabs, form inputs, textareas, selects, labels, editable regions, and common ARIA controls.
- Search-safe form labels: form fields use labels/placeholders/ARIA metadata instead of exposing typed field values.
- Spatial NAV cleanup with rectangle-based directional proximity and duplicate-wrapper suppression.
- Current selection is identified in the bottom status bar by control type and label.
- Context-sensitive shortcut hints change between SEARCH and NAV.
- Compact built-in keyboard cheat sheet via Ctrl+/ (or ? in NAV).
- Arrow-key search-result navigation in addition to Ctrl+j/k.
- Row-edge jumps with 0 and $.
- Half-page and full-page keyboard scrolling while preserving hjkl for selection.
- One-key NAV → SEARCH transition with `/`.
- Manual `r` rescan for pages that dynamically add/remove controls.
- Pending `g`/`t` corner sequences are shown in the UI so multi-key commands are discoverable.
- NAV result-list isolation: the fuzzy list remains a SEARCH-only UI and never constrains NAV after its starting point.
- Minimal two-line bottom bar keeps page content visible while still showing mode, query, selection, counts, and hints.

## Hover menus

When a control becomes selected, the extension emits pointer/mouse hover events. This supports many JavaScript/focus-driven menus and then rescans the page for newly revealed controls. Pure CSS-only `:hover` state cannot be forced generically by an extension.

## v2.0.1 change

- Added an extension settings page for the activation shortcut. Click the shortcut field and press the desired key combination, then Save.
- The shortcut is stored with `chrome.storage.sync`, so it can follow your Edge profile when extension settings sync is available.
- **Ctrl+,** opens the settings page from a normal webpage.
- Removed the fixed manifest-level activation command so the custom shortcut does not double-trigger.


## v2.1.1 changes

- Removed the experimental third-page-remapping mode; Fuzzy Links is focused again on **SEARCH** and **NAV**.
- **Enter no longer closes Fuzzy Links before activation.**
- If activation causes a normal page navigation/reload, the browser naturally unloads the current content script.
- If the page remains loaded — for example when opening a dropdown, hover menu, accordion, popover, dialog, or SPA view — the current mode remains active.
- Fuzzy Links performs a fast rescan and a short settle rescan after activation so newly revealed controls become available automatically.
- In **NAV**, the current selection is preserved when possible while newly revealed controls join the spatial navigation pool.
- In **SEARCH**, the existing query stays intact, new visible controls are added to the fuzzy candidate set, and focus returns to the query field so typing can continue immediately.
- `Shift+Enter` on links opens a new tab while leaving the current SEARCH/NAV session active.


## v2.1.2 changes

### Session persistence across reloads
- An open Fuzzy Links session now survives a normal page reload in the same tab.
- SEARCH/NAV mode, the SEARCH query, result-list visibility, and a signature of the selected control are saved in `sessionStorage`.
- After reload, Fuzzy Links reopens automatically and attempts to restore the same control using its ID, URL, name, role, kind, and visible label.
- If the exact control cannot be found after reload, the mode still restores and falls back to the first appropriate visible candidate.
- Pressing **Esc** still explicitly closes Fuzzy Links and clears the saved session.

### Context-aware scrolling
- NAV scrolling now follows the selected element's scroll context.
- `Ctrl+h/j/k/l` searches upward from the selected control for the nearest ancestor that can scroll in the requested axis.
- `Ctrl+d/u` and `Ctrl+f/b` use the selected control's nearest vertically scrollable ancestor and scale the movement to that container's visible height.
- If there is no matching local scroll container, scrolling falls back to the page/window.
- After scrolling a sidebar, menu, panel, table, or other nested container, Fuzzy Links explicitly rescans visible controls so newly exposed controls can be navigated immediately.


## v2.1.3 changes

- `Ctrl+Space` starts a new session in **QUERY** mode.
- During an active session, `Ctrl+Space` toggles **QUERY ↔ NAV**.
- `Esc` in QUERY moves to NAV.
- `Esc` in NAV ends the session.
- `/` in NAV returns to QUERY.
- Every transition into QUERY clears the fuzzy string.
- Sessions still survive reloads/navigation in the same tab, but the restored page always starts in QUERY with an empty query.

Recommended flow:

`Ctrl+Space` → type query → `Esc` → NAV → navigate/activate → `/` → fresh QUERY


## v2.2.0 — NORMAL mode

When no Fuzzy Links QUERY/NAV session is active, the extension now provides a lightweight Vimium-style NORMAL mode.

### NORMAL-mode keys

| Key | Action |
| --- | --- |
| `h` | Scroll left |
| `j` | Scroll down |
| `k` | Scroll up |
| `l` | Scroll right |
| `d` | Scroll half a page down |
| `u` | Scroll half a page up |
| `gg` | Jump to the top of the page |
| `G` | Jump to the bottom of the page |
| `gi` | Focus the first visible usable text-entry control |

`gi` recognizes normal text inputs, textareas, selects, contenteditable regions, and ARIA textboxes. If there is no visible text field, it finds the first rendered field on the page, scrolls it into view, and focuses it.

### Text-entry safety

When a webpage text-entry control is active, Fuzzy Links becomes completely passive.

This means the extension does **not** intercept:

- `Ctrl+Space`
- `/`
- `Esc`
- `h/j/k/l`
- `gg`
- `G`
- `gi`
- QUERY/NAV shortcuts

Typing, editor shortcuts, and site-specific input behavior are passed through unchanged.

The extension's own QUERY input is excluded from this safety rule so QUERY-mode navigation continues to work normally.


## v2.3.0 — Nested NORMAL scrolling and Vim-style text editing

### Smarter NORMAL scrolling

NORMAL-mode `h/j/k/l` first try the document itself.

If the document cannot scroll farther in that direction, Fuzzy Links scans nested page containers and selects a visible scrollable region that can move in the requested direction. This supports applications whose main content lives in internal panes, sidebars, lists, terminals, editors, or dashboard panels rather than the top-level document.

### Text-field editor modes

Focusing a text field now starts a local Vim-like editor session in **INSERT** mode.

#### INSERT

- Type normally.
- All Fuzzy Links session/page shortcuts remain disabled.
- `Esc` → text NORMAL.

#### Text NORMAL

For ordinary text inputs and textareas:

- `h` / `l` — caret left/right
- `w` / `b` — next/previous word
- `0` / `$` — beginning/end
- `i` — INSERT at caret
- `a` — INSERT after caret
- `I` / `A` — INSERT at beginning/end
- `x` — delete character under caret
- `v` — VISUAL
- `Esc` — leave the text box and return to page NORMAL

#### VISUAL

- `h/l/w/b/0/$` — extend the selection
- `d` or `x` — delete selection and return to text NORMAL
- `i` — enter INSERT
- `Esc` — collapse selection and return to text NORMAL

Contenteditable controls and select-like controls still get INSERT/NORMAL/VISUAL entry/exit behavior, but destructive caret commands are intentionally limited because those controls do not expose the same reliable `selectionStart`/`selectionEnd` API as standard text inputs and textareas.

### Text-box safety

While any page text field is active:

- `Ctrl+Space` does not start or toggle a fuzzy session.
- Page NORMAL shortcuts do not run.
- The local text editor owns the relevant Vim keys instead.


## v2.4.0 — Expanded Vim text commands and smooth scrolling

### Text-mode badge

Whenever a webpage text control is focused, a small badge appears in the bottom-right corner:

- `TEXT INSERT`
- `TEXT NORMAL`
- `TEXT VISUAL`
- `TEXT NORMAL · d…`, `c…`, `y…`, or `r…` while a multi-key command is pending

The badge disappears when the text control is exited.

### Text NORMAL commands

In addition to the existing motions and insert commands:

#### Motions

- `h` / `l` — left/right
- `w` / `b` / `e` — next word / previous word / end of word
- `0` / `$` — beginning/end of current line

#### Delete

- `x` / `X` — delete character at / before caret
- `dd` — delete current line
- `dw` — delete through next word boundary
- `db` — delete backward to previous word
- `de` — delete through word end
- `d$` or `D` — delete to end of line
- `d0` — delete to beginning of line

#### Change

- `s` — delete character and enter INSERT
- `cc` — change current line
- `cw` — change through next word boundary
- `cb` / `ce` — change backward / through word end
- `c$` or `C` — change to end of line
- `c0` — change to beginning of line
- `r<char>` — replace the character under the caret

#### Yank / paste

Fuzzy Links maintains a small text register for Vim-style edits:

- `yy` — yank current line
- `yw` / `yb` / `ye` — yank by word motion
- `y$` / `y0` — yank to line boundary
- `p` — paste after
- `P` — paste before

#### Insert

- `i` / `a` — insert at / after caret
- `I` / `A` — insert at beginning / end of line
- `o` / `O` — open a new line below / above (textarea)

### VISUAL commands

- `h/l/w/b/e/0/$` — extend selection
- `d` or `x` — delete selection
- `c` — change selection
- `y` — yank selection
- `Esc` — return to text NORMAL

### Smooth scrolling

All Fuzzy Links programmatic scrolling now uses smooth browser scrolling rather than instant jumps. This includes:

- NORMAL `h/j/k/l`
- NORMAL `d/u`
- NAV contextual scrolling
- `gg` / `G`
- scrolling nested sidebars and panels
- scrolling text fields into view

NORMAL half-page scrolling also uses the same nested-container discovery as `h/j/k/l`, so it can scroll an application pane even when the top-level document itself does not scroll.


## 2.4.0 NORMAL scrolling hotfix

The 2.4.0 text-editor rewrite accidentally omitted the NORMAL-mode scroll-target
helper functions. As a result, `h/j/k/l` and `d/u` in page NORMAL mode could fail
entirely while NAV scrolling continued to work.

This hotfix restores the exact working target-discovery helpers from v2.3.0:

- top-level document scrolling is used when it can move in the requested direction;
- otherwise visible nested scroll containers are searched;
- nested panels/sidebars can therefore be scrolled from page NORMAL mode again.

The v2.4.0 text editing implementation is unchanged. The actual scroll motion is
animated with a short 150 ms smoothstep animation.


## v2.5.0 — Tab controls and hint mode

### NORMAL-mode tab controls

| Key | Action |
| --- | --- |
| `t` | Open a new tab |
| `J` | Go one tab left |
| `K` | Go one tab right |
| `g0` | Go to the first tab |
| `g$` | Go to the last tab |
| `yt` | Duplicate the current tab |
| `x` | Close the current tab |
| `X` | Restore the most recently closed tab |

These shortcuts only run in page NORMAL mode. They are disabled while editing text or while QUERY/NAV is active.

### Double-Shift hint mode

Press **Shift twice quickly** to enter HINT mode.

Fuzzy Links overlays a small one- or two-letter label on each currently visible selectable control. Type the label to activate that control.

- One-letter hints are assigned first.
- Additional controls receive two-letter hints.
- `Backspace` removes the last typed hint character.
- `Esc` exits HINT mode.
- Choosing a text field focuses it and starts TEXT INSERT mode.
- Choosing a button/link activates the underlying control.
- HINT mode is unavailable while a text field or QUERY/NAV session is active.
