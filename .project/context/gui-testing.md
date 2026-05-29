# GUI Testing Policy

## Enforcement Mode
- Required for extension UI, content script, popup, onboarding, sidebar, toolbar,
  annotation, design mode, bug report, performance, inspiration, screenshot, or
  Chrome permission changes.
- Advisory for server-only, documentation-only, Delano-only, or release-config
  changes unless they affect browser behavior.

## Smoke Routes
- Unpacked Chrome extension in `chrome://extensions/` with `extension/`
  selected, or generated Firefox/Zen package loaded from `dist/firefox/`.
- A localhost app route such as `http://localhost:3000`, `http://localhost:5173`,
  or the repo demo page at `http://localhost:8080/testing/demo-app/index.html`.
- Extension popup and sidebar open/close flow.
- Annotation creation, annotation display, annotation deletion or status update,
  and URL-filtered annotation loading.
- Bug report recording, performance investigation recording, screenshot capture,
  and backend-log toggle when relevant.
- Design mode and inspiration capture when relevant.
- Non-localhost page behavior for sidebar/onboarding/settings when relevant.

## Console Filtering
- Blocking: uncaught exceptions in the page, content script, background service
  worker, or popup that break the tested flow.
- Blocking: failed calls to `http://127.0.0.1:4242` when the server is expected
  to be running.
- Blocking: browser extension permission, injection, debugger attach/detach where
  supported, or content script load errors on supported localhost pages.
- Non-blocking only when explained: pre-existing app console noise unrelated to
  the touched Pointa feature.

## Evidence Requirements
- Note the browser, extension package/load state, server command, and tested URL.
- Capture screenshots or short recordings for visible UI changes.
- Capture browser console and background service worker errors when debugging
  extension behavior.
- For server-backed flows, include `pointa-server status` or the local server
  URL health result when relevant.
- For demo fixture verification, note whether `scripts/load-demo.sh` and
  `scripts/clear-demo.sh` were used.

## Design Validation Threshold
- UI must remain usable on realistic localhost pages without covering the target
  content in a way that blocks core site interaction.
- Floating toolbar, sidebar, badges, overlays, and modals must not overlap each
  other incoherently.
- Text in compact controls must fit at common browser widths and in light/dark
  themes.
- Screenshot, responsive capture, and design mode states must preserve enough
  visual context for AI agents and humans to understand the issue.
