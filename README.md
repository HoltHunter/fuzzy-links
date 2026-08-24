# Fuzzy Links

Fuzzy Links is a keyboard-first browser extension for navigating web pages without reaching for the mouse.

It combines fuzzy search with spatial Vim-style navigation so you can quickly locate, select, activate, and scroll through links, buttons, menus, forms, sidebars, dialogs, and other interactive controls.

The extension is currently developed and tested for **Microsoft Edge**, and should also work on other Chromium-based browsers such as Brave and Chrome with minimal or no changes.

## Features

- Fuzzy search across visible interactive controls
- Vim-style spatial navigation with `h`, `j`, `k`, and `l`
- Keyboard activation of links, buttons, menus, tabs, forms, and ARIA controls
- Persistent sessions across same-tab page reloads/navigation
- Query automatically clears on a newly loaded page
- Context-aware scrolling for sidebars, panels, menus, tables, and nested scroll containers
- `Shift+Enter` opens selected links in a new tab
- Hover-event simulation for many JavaScript-driven menus
- Minimal bottom status bar
- Optional fuzzy-result list
- Built-in keyboard help
- User-configurable session activation shortcut
- `chrome.storage.sync` support for shortcut settings

## Default Workflow

Start a session:

```text
Ctrl+Space
```

A new session starts in **QUERY** mode.

Typical flow:

```text
Ctrl+Space
    ↓
QUERY
    ↓ type fuzzy query
Esc
    ↓
NAV
    ↓ h / j / k / l
Enter
```

While a session is active:

- `Ctrl+Space` toggles QUERY ↔ NAV
- `Esc` in QUERY moves to NAV
- `Esc` in NAV closes the session
- `/` in NAV returns to a fresh QUERY
- Every transition into QUERY clears the previous query

If the current tab navigates or reloads while the session is open, Fuzzy Links automatically restores the session on the new page in QUERY mode with an empty query.

## Default Key Bindings

### Session

| Key | Action |
| --- | --- |
| `Ctrl+Space` | Start session / toggle QUERY ↔ NAV |
| `Esc` in QUERY | Enter NAV |
| `Esc` in NAV | End session |
| `/` in NAV | Return to QUERY |
| `Ctrl+,` | Open extension settings |
| `Ctrl+/` | Toggle keyboard help |

### QUERY Mode

| Key | Action |
| --- | --- |
| Type normally | Fuzzy search visible interactive controls |
| `Arrow Down` | Next fuzzy result |
| `Arrow Up` | Previous fuzzy result |
| `Ctrl+j` | Next fuzzy result |
| `Ctrl+k` | Previous fuzzy result |
| `Enter` | Activate selected result |
| `Shift+Enter` | Open selected link in a new tab |
| `Ctrl+.` | Show/hide fuzzy-result list |
| `Esc` | Enter NAV |

QUERY remains open after `Enter` when the current document stays loaded. This is useful for opening menus, dialogs, accordions, and SPA UI without restarting the session.

### NAV Mode

| Key | Action |
| --- | --- |
| `h` | Move to nearest interactive control on the left |
| `j` | Move to nearest interactive control below |
| `k` | Move to nearest interactive control above |
| `l` | Move to nearest interactive control on the right |
| `Enter` | Activate selected control |
| `Shift+Enter` | Open selected link in a new tab |
| `0` | Leftmost control in the current visual row |
| `$` | Rightmost control in the current visual row |
| `gg` | Top-left visible control |
| `G` | Bottom-left visible control |
| `tt` | Top-right visible control |
| `T` | Bottom-right visible control |
| `r` | Rescan visible interactive controls |
| `/` | Return to QUERY |
| `?` | Toggle help |
| `Esc` | End session |

### Scrolling in NAV

Scrolling follows the currently selected control.

If the selected control is inside a scrollable sidebar, panel, menu, table, or other nested container, Fuzzy Links scrolls that container instead of the page.

| Key | Action |
| --- | --- |
| `Ctrl+h` | Scroll left |
| `Ctrl+j` | Scroll down |
| `Ctrl+k` | Scroll up |
| `Ctrl+l` | Scroll right |
| `Ctrl+d` | Half-page down |
| `Ctrl+u` | Half-page up |
| `Ctrl+f` | Nearly full-page down |
| `Ctrl+b` | Nearly full-page up |

If no scrollable ancestor exists in the requested direction, scrolling falls back to the main page.

## Supported Controls

Fuzzy Links recognizes common interactive elements including:

- Links
- Buttons
- Inputs
- Textareas
- Selects
- Summaries
- Labels
- Editable regions
- Menu items
- Tabs
- Checkboxes
- Radio buttons
- Switches
- ARIA links/buttons/options/textboxes
- Elements with `aria-haspopup`
- Elements with click handlers
- Keyboard-focusable controls

## Hover Menus

When a control is highlighted, Fuzzy Links emits common pointer/mouse hover events. This makes many JavaScript-driven hover menus expose their child controls so they can be searched or navigated.

Pure CSS-only `:hover` state cannot be forced generically by a browser extension.

## Installation

### Microsoft Edge

1. Clone or download this repository.
2. Open:

   ```text
   edge://extensions
   ```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository directory containing `manifest.json`.

### Brave

The extension is Chromium-based and can also be loaded in Brave:

```text
brave://extensions
```

Enable Developer mode and choose **Load unpacked**.

## Changing the Activation Shortcut

The default session shortcut is:

```text
Ctrl+Space
```

You can change it from the extension's Options page.

On a normal webpage, press:

```text
Ctrl+,
```

Then capture and save your preferred shortcut.

The setting is stored through `chrome.storage.sync`.

## Project Structure

```text
fuzzy-links/
├── manifest.json
├── content.js
├── background.js
├── options.html
├── options.js
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── .gitignore
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.yml
    │   └── feature_request.yml
    └── pull_request_template.md
```

### `content.js`

Contains the in-page UI, fuzzy matching, candidate detection, spatial navigation, session persistence, control activation, and context-aware scrolling.

### `background.js`

Handles extension-level actions such as opening links in new tabs and opening the settings page.

### `options.html` / `options.js`

Provides the user-editable activation shortcut.

## Development

No build system is required.

The extension is plain Manifest V3 JavaScript, HTML, and CSS.

After making changes:

1. Open `edge://extensions`.
2. Find Fuzzy Links.
3. Click **Reload**.
4. Refresh any open pages where you want to test the updated content script.

### Syntax Check

If Node.js is installed:

```bash
node --check content.js
node --check background.js
node --check options.js
```

## Current Limitations

- Cross-origin iframe contents cannot be inspected from the parent page.
- Highly virtualized applications can only expose controls currently mounted in the DOM.
- Pure CSS `:hover` cannot be synthesized programmatically.
- Websites with unusual custom interaction systems may require additional candidate detection rules.
- Browser-internal pages such as `edge://` pages generally do not allow normal content-script injection.

## Roadmap Ideas

Potential future improvements include:

- Automated tests for fuzzy ranking and directional navigation
- Optional visual hint labels similar to browser Vim extensions
- Per-site configuration
- Customizable NAV key bindings
- Better iframe support where permissions allow it
- Published Edge Add-ons / Chrome Web Store packages
- Accessibility-tree-aware candidate discovery

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and pull request guidance.

If you find a navigation case that behaves poorly, a good bug report includes:

- Browser and version
- URL or reproducible HTML example
- Current selected control
- Key pressed
- Control you expected to be selected
- Control that was actually selected

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Version

Current version: **2.1.3**
