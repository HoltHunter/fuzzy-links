# Release Checklist

1. Update `manifest.json` version.
2. Update `CHANGELOG.md`.
3. Update the README version if referenced.
4. Run JavaScript syntax checks.
5. Load the unpacked extension in Edge and smoke-test QUERY/NAV behavior.
6. Create a ZIP with the extension runtime files.
7. Create a Git tag such as `v2.1.3`.
8. Publish a GitHub Release and attach the runtime ZIP.
