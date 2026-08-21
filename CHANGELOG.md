# Changelog

All notable changes to Fuzzy Links are documented here.

The format is based on Keep a Changelog principles.

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
