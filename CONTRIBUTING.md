# Contributing to Fuzzy Links

Thanks for considering a contribution.

## Development Setup

Fuzzy Links is a plain Manifest V3 browser extension and does not require a build step.

1. Fork and clone the repository.
2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository root.
5. Make your changes.
6. Click **Reload** on the extension card after editing extension files.
7. Refresh the test page.

## Code Style

- Keep the extension dependency-free unless a dependency provides substantial value.
- Prefer small, focused functions.
- Preserve keyboard-only usability.
- Avoid introducing shortcuts that conflict with common browser or text-entry behavior.
- Keep UI overlays minimal and non-destructive.
- Do not read or expose the current value of form fields merely to build fuzzy labels.

## Testing Checklist

Before opening a pull request, test:

- QUERY fuzzy matching
- QUERY → NAV transition
- NAV → QUERY transition
- Session close behavior
- Same-tab reload restoration
- Links
- Buttons
- Menus
- Form fields
- Nested scrolling containers
- `Shift+Enter`
- Dynamic controls that appear after activation
- Configurable activation shortcut

If Node.js is available, also run:

```bash
node --check content.js
node --check background.js
node --check options.js
```

## Pull Requests

Keep pull requests focused.

Include:

- What changed
- Why it changed
- How it was tested
- Screenshots or recordings for UI changes when useful
- A reproducible example for navigation-algorithm changes

## Bug Reports

Navigation bugs are easiest to diagnose when the report identifies:

- The selected element
- The key pressed
- The expected target
- The actual target
- The page layout involved
