---
type: research_findings
project: firefox-port
slug: firefox-extension-port
created: 2026-05-29T19:06:19Z
updated: 2026-05-29T19:10:19Z
---

# Findings: Firefox Extension Port Research

## Source References

- `extension/manifest.json`: current Manifest V3 Chrome extension declaration.
- `extension/background/background.js`: programmatic script injection, local API bridge, screenshot capture, responsive viewport override, and CDP recording implementation.
- `extension/content/content.js` and `extension/content/modules/*`: content-script messaging, toolbar/sidebar UI, annotation, bug report, performance, design, and inspiration flows.
- `.project/context/tech-context.md`: repo context for extension/server architecture and constraints.
- `npx --yes web-ext lint --source-dir extension --output json`: Firefox tooling baseline; returned 2 errors and 43 warnings.
- MDN Chrome incompatibilities: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities
- MDN background manifest key: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
- MDN scripting API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting
- MDN scripting execution worlds: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/ExecutionWorld
- MDN content scripts: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
- MDN tabs.captureVisibleTab: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab
- MDN webRequest API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest
- MDN host_permissions: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions
- MDN browser_specific_settings: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
- Firefox Extension Workshop web-ext guide: https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/
- Firefox Extension Workshop signing overview: https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/

## Observations

- The current manifest is not Firefox-ready. `web-ext lint` reports `BACKGROUND_SERVICE_WORKER_NOFALLBACK` because the current MV3 manifest only declares `background.service_worker`; Firefox requires or expects a `background.scripts` fallback for compatibility. It also reports `ADDON_ID_REQUIRED` because MV3 signing requires a Gecko add-on ID.
- Firefox supports the `chrome` namespace for compatibility and also supports promise-based APIs, so the current `await chrome.*` style is not the first blocker. A cross-browser wrapper is still recommended to make capability detection explicit.
- Programmatic injection is viable. Pointa uses `chrome.scripting.executeScript` and `chrome.scripting.insertCSS` in `extension/background/background.js`; MDN documents the `scripting` API in Firefox with the same permission model around `scripting`, host permissions, and `activeTab`.
- The main non-portable capability is `chrome.debugger`. Firefox documents Chrome's debugger API as not implemented, and `web-ext lint` flags every Pointa use of `debugger.attach`, `debugger.sendCommand`, `debugger.detach`, `debugger.onEvent`, and `debugger.onDetach`.
- Pointa uses `chrome.debugger` for three product capabilities: CDP screenshot capture when viewport emulation is active, responsive viewport emulation through `Emulation.setDeviceMetricsOverride`, and bug/performance recording through CDP `Network`, `Log`, and `Runtime` domains.
- Normal visible-tab screenshot capture can remain. Pointa already falls back to `chrome.tabs.captureVisibleTab` outside viewport override paths, and MDN documents `tabs.captureVisibleTab` in Firefox with `activeTab` or broad host permission requirements.
- Firefox content scripts have a different isolation model, including Xray behavior. For page-console instrumentation, a Firefox implementation should use a `scripting.executeScript` `MAIN` world injection or `userScripts` after explicit permission, not assume content scripts can directly observe page globals.
- Network timeline parity can likely be approximated with `webRequest` observation for permitted hosts. MDN requires the `webRequest` API permission plus host permissions for observed request hosts; subresources require permission for both the page and resource host.
- Firefox MV3 install prompts now display host permissions from `host_permissions` and `content_scripts` in Firefox 127+. Pointa's local-only host permissions are a good baseline, but onboarding should explain why localhost access is needed and possibly add HTTPS local patterns if desired.
- Firefox packaging/review has additional manifest requirements: MV3 add-on ID in `browser_specific_settings.gecko.id`; new Firefox submissions must declare `browser_specific_settings.gecko.data_collection_permissions`; signed add-ons are required for release/beta Firefox distribution through AMO or self-distribution signing.
- The current source has many `innerHTML` linter warnings. Existing docs say user input is generally escaped, but AMO review risk remains. A Firefox port should audit these warnings before submission.

## Options Considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Single manifest shared by Chrome and Firefox | Minimal packaging complexity | Conflicting background requirements, Gecko ID/data consent keys, and invalid Firefox `debugger` permission make this brittle | Reject for initial port |
| Generated browser-specific manifests with shared JS/CSS/assets | Keeps one source tree while letting Chrome and Firefox differ where required | Requires build script and CI lint matrix | Recommended |
| Firefox MVP with CDP-dependent features disabled or degraded | Fastest path to a usable Firefox add-on for annotations, MCP, sidebar/toolbar, normal screenshots, and local server workflows | Bug/performance timelines and responsive capture are not parity-complete | Recommended first milestone |
| Full parity before release | Best product completeness | Requires redesigning CDP features without `chrome.debugger`; high uncertainty | Defer until MVP validates |
| Use Firefox `webRequest` plus main-world script instrumentation for issue timelines | Replaces some CDP behavior with supported APIs | More permissions and less complete than CDP; needs careful privacy review | Prototype in probe |
| Use native messaging for deep parity with a local helper | Could theoretically expose richer local capabilities | Heavy install burden, separate host manifests, review complexity, and poor fit for simple browser-store install | Reject unless MVP proves impossible |

## Fold-Forward Candidates

| Finding | Target Artifact | Proposed Change |
| --- | --- | --- |
| Firefox port is not a manifest-only change because `chrome.debugger` is unsupported. | `spec.md`, `plan.md`, `decisions.md` | Add CDP replacement/degradation as required architecture work. |
| Browser-specific manifest generation is required. | `plan.md`, `decisions.md` | Add packaging workstream and decision for generated Firefox manifest. |
| `web-ext lint` gives an actionable gate. | `plan.md` | Add `web-ext lint --source-dir dist/firefox` to validation. |
| Add-on ID and data collection manifest keys are required for Firefox submission. | `spec.md`, `plan.md` | Add release requirements for `browser_specific_settings.gecko`. |
| Core annotation and MCP workflows look portable. | `spec.md` | Define MVP scope around annotation/sidebar/toolbar/local server/normal screenshots. |

## Open Questions

- What minimum Firefox version should Pointa target: current desktop only, Firefox ESR, or desktop plus Android?
- Should Firefox launch as an MVP with degraded bug/performance capture, or wait for near-parity with Chrome?
- Should the Firefox package remain AMO-listed, self-distributed/unlisted, or both?
- Should the Firefox manifest add HTTPS localhost host permissions, or keep the current HTTP-only local host scope for a smaller permission story?
- How much of the `innerHTML` linter warning set must be refactored before AMO review, versus documented as sanitized templates?
