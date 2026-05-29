# Firefox Port

Pointa's Firefox package is generated from the shared Chrome extension source in
`extension/`. The generated output lives in `dist/firefox/` and is not the source
of truth.

## Package Architecture

- Shared source: `extension/`
- Chrome manifest: `extension/manifest.json`
- Firefox build script: `scripts/build-firefox-extension.js`
- Firefox output: `dist/firefox/`
- Firefox package artifacts: `dist/firefox-artifacts/`

The build script copies the shared extension files, then writes a Firefox
manifest that:

- uses `background.scripts` instead of the Chrome service worker declaration;
- includes `browser_specific_settings.gecko.id`;
- includes `browser_specific_settings.gecko.data_collection_permissions`;
- removes Chrome's top-level `privacy_policy` key because Firefox reports it as
  an unexpected WebExtension manifest property;
- removes the unsupported `debugger` permission;
- removes Chrome's broad `tabs` permission because Firefox can read tab URL
  metadata through matching host permissions or `activeTab`;
- preserves the Chrome manifest unchanged.

## Background and Injection Runtime

Firefox runs the generated MV3 package with `background.scripts`; Chrome keeps
using the shared source manifest's service worker. `extension/common/browser-compat.js`
is loaded before background initialization and before content modules so shared
capabilities, local-server URLs, and browser namespace behavior are available in
both runtimes.

The action click path now checks unsupported page schemes before injection,
waits on one in-flight injection per tab, inserts `content/content.css`, and
injects content modules in a fixed order. Per-file markers make retries safe if
a page navigation or browser restriction interrupts the first injection attempt.
The Firefox build also appends a final `void 0` completion to generated content
and shared content-helper scripts. Firefox structured-clones `executeScript`
file results, so files ending with global class/object assignments can otherwise
abort injection with a non-structured-clonable result even when the script loaded
successfully.

## Element Anchoring

Firefox annotations use the same shared anchoring model as Chrome. Saved
annotations now include stable element attributes (`id`, test/data attributes,
ARIA labels, role/name/type, and similar signals), trimmed text, geometry,
sibling indexes, and parent context. Reload matching tries stable attributes
before text, class, or positional fallbacks, which reduces reliance on brittle
`nth-child` selectors after DOM changes.

## Firefox Permission Scope

The generated Firefox manifest currently keeps only these API permissions:

| Permission | Reason |
| --- | --- |
| `activeTab` | Grants the clicked tab for action-triggered injection and browser-recognized extension actions. |
| `storage` | Stores onboarding, settings, and integration keys in extension-local storage. |
| `scripting` | Injects Pointa CSS and ordered content modules into supported pages. |

Firefox host permissions include local-development hosts plus `<all_urls>`:

```json
[
  "http://localhost/*",
  "http://127.0.0.1/*",
  "http://0.0.0.0/*",
  "http://*.local/*",
  "http://*.test/*",
  "http://*.localhost/*",
  "<all_urls>"
]
```

These patterns cover the pages Pointa annotates and the local `pointa-server`
API. `<all_urls>` is required for reliable persistent in-page screenshot capture
from the Pointa toolbar after navigation or toolbar auto-reopen, where the
temporary `activeTab` grant from the browser action may no longer be available.
MDN documents that `tabs.captureVisibleTab` requires `<all_urls>` or
`activeTab`, and `activeTab` only follows a qualifying extension user action.
MDN also documents that MV3 host permissions belong in
[`host_permissions`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions),
and that matching host permissions can provide tab URL metadata without
[`tabs`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions).

## Commands

```bash
npm run firefox:build
npm run firefox:lint
npm run firefox:run
npm run firefox:package
```

`firefox:lint` and `firefox:package` both rebuild `dist/firefox/`. Do not run
them in parallel because they write the same generated directory.

## Local Firefox Install

For manual user testing without AMO signing:

1. Run `npm install` if dependencies are not installed.
2. Run `npm run firefox:build`.
3. Open `about:debugging#/runtime/this-firefox` in Firefox.
4. Choose **Load Temporary Add-on...** and select `dist/firefox/manifest.json`.
5. Start `pointa-server` through MCP or run `cd annotations-server && npm run dev`.
6. Open a supported local page such as `http://localhost:3000` and click the
   Pointa toolbar icon.

Temporary add-ons are removed when the Firefox profile closes. Use
`npm run firefox:run` for repeated development sessions with a generated
testing profile.

## Current Lint Baseline

`npm run firefox:lint` currently exits with zero errors. Remaining warnings are
tracked below.

| Warning | Owner | Disposition |
| --- | --- | --- |
| `UNSUPPORTED_API` for `chrome.debugger` calls in `background/background.js` | WS-002 / T-008 | Expected until debugger/CDP paths are capability-gated or replaced for Firefox. |
| `UNSAFE_VAR_ASSIGNMENT` for dynamic `innerHTML` writes in UI modules | WS-005 / T-025 | Audit before AMO submission; refactor or document each warning. |

See `docs/FIREFOX_EVIDENCE_CAPTURE.md` for the Firefox replacement model for
console logs, page errors, network metadata, backend logs, screenshots, and
the QA/release parity labels for Available, Approximate, and Unavailable states.
See `docs/FIREFOX_RELEASE.md` for the current signing and distribution path.

The resolved baseline errors were:

- missing Firefox-compatible background fallback;
- missing Gecko add-on ID;
- invalid Firefox `debugger` manifest permission.

## Release Notes

The generated Firefox manifest currently declares `websiteActivity` and
`websiteContent` data collection permissions because Pointa records page
annotations, screenshots, page activity evidence, and related local development
context. See `docs/FIREFOX_PRIVACY_DECLARATION.md` for the privacy and
integration data-handling wording required before public submission.
