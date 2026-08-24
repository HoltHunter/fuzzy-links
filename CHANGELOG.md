# Changelog

All notable changes to Fuzzy Links are documented here.

The format is based on Keep a Changelog principles.

## [2.5.1] - 2026-08-24

### Fixed

- Fixed a packaging error in v2.5.0 where the keydown handler referenced HINT mode functions that were missing from `content.js`.
- Restored the HINT mode key handler and double-Shift activation handler.

## [2.5.0] - 2026-08-24

### Added

- Added NORMAL-mode browser tab controls:
  - `t` creates a new tab.
  - `J` moves one tab left.
  - `K` moves one tab right.
  - `g0` moves to the first tab.
  - `g$` moves to the last tab.
  - `yt` duplicates the current tab.
  - `x` closes the current tab.
  - `X` restores the most recently closed tab.
- Added HINT mode, entered by pressing `Shift` twice in quick succession.
- HINT mode displays one- or two-letter labels next to visible selectable controls.
- Typing a displayed hint activates the corresponding control.
- `Esc` exits HINT mode and `Backspace` removes the last entered hint character.
- Selecting a text field through HINT mode focuses it and enters TEXT INSERT mode.

### Changed

- Added the `tabs` and `sessions` extension permissions for tab-management commands.

## [2.4.0] - 2026-08-24

### Added

- Expanded Vim-style editing for webpage text fields.
- Added a bottom-right text-mode indicator for `TEXT INSERT`, `TEXT NORMAL`, and `TEXT VISUAL`.
- Added pending-command indicators for multi-key text commands.
- Added common Vim text-editing commands, including:
  - `dd`, `dw`, `db`, `de`, `d0`, `d$`, and `D`.
  - `cc`, `cw`, `cb`, `ce`, `c0`, `c$`, and `C`.
  - `yy`, `yw`, `yb`, `ye`, `y0`, and `y$`.
  - `x`, `X`, `s`, `r<char>`, `p`, `P`, `o`, and `O`.
- Expanded VISUAL-mode operations with delete, change, and yank commands.

### Changed

- Added smooth scrolling for extension-controlled scrolling.
- Restored the v2.3.0 NORMAL-mode scroll-target discovery logic after a v2.4.0 regression so page and nested-container scrolling work outside NAV mode.

## [2.3.0] - 2026-08-24

### Added

- Added Vim-style NORMAL/INSERT/VISUAL editing modes for standard webpage text fields.
- `Esc` from INSERT enters TEXT NORMAL mode.
- `v` from TEXT NORMAL enters TEXT VISUAL mode.
- `Esc` from TEXT NORMAL exits the active text field.

### Changed

- Improved page NORMAL-mode scrolling so, when the top-level page cannot scroll in a requested direction, Fuzzy Links searches visible nested scrollable containers.
- Fuzzy-session shortcuts remain disabled while a webpage text field is active.

## [2.1.3] - 2026-08-21

### Changed

- Reworked session mode controls:
  - `Ctrl+Space` starts a session in QUERY mode.
  - `Ctrl+Space` toggles QUERY and NAV while a session is active.
  - `Esc` moves QUERY → NAV.
  - `Esc` from NAV closes the session.
  - `/` moves NAV → QUERY.
- QUERY clears every time it is entered.
- Restored sessions always begin with an empty query.

## [2.1.2] - 2026-08-21

### Added

- Session persistence across same-tab reloads/navigation.
- Context-aware scrolling for nested scrollable containers.

### Changed

- Scroll commands now target the nearest scrollable ancestor of the selected control.

## [2.1.1] - 2026-08-21

### Changed

- Removed experimental alternate full-page navigation view.
- `Enter` no longer closes the extension when the current page remains loaded.
- Added automatic post-activation rescans for newly revealed controls.

## [2.0.1] - 2026-08-21

### Added

- Editable activation shortcut through the Options page.
- Shortcut persistence using `chrome.storage.sync`.

## [2.0.0] - 2026-08-21

### Added

- Expanded interactive control detection.
- Spatial NAV mode improvements.
- Row-edge and corner jumps.
- Contextual help panel.
- Minimal bottom status UI.
- Form-field navigation.
- Manual candidate rescanning.
- Additional scrolling shortcuts.

## [1.x]

Initial fuzzy-link search, button support, hover-menu support, SEARCH/NAV modes, spatial navigation, and minimal UI.
