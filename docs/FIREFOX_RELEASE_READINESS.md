# Firefox Release Readiness

Date: 2026-05-29

## Decision

Recommendation: internal beta candidate; defer public AMO release.

The Firefox/Zen build now supports the core local annotation workflow, local
server connectivity, annotation image attachments, and the Firefox-supported
evidence model. Public release should wait for a focused Chrome regression pass
and final AMO warning cleanup.

## Validation Evidence

- `npm run firefox:lint` passes with 0 errors and the documented 46-warning
  baseline.
- `npm run firefox:package` creates
  `dist/firefox-artifacts/pointa-1.3.6.zip`.
- `delano validate` passes with 0 errors and 1 existing compatibility warning
  for missing `.claude`.
- Zen regular-profile smoke created annotation
  `pointa_1780090769092_zb4jkbqsh` on `http://127.0.0.1:3977/`.
- That annotation has one WebP screenshot attachment:
  `1124 x 946 px`, `17,924 bytes`.
- `http://127.0.0.1:4242/health` returns server status `ok`, version `1.3.6`.
- Chrome regression was attempted with a temporary Chrome profile, but the
  installed Google Chrome build logged `--load-extension is not allowed in Google
  Chrome, ignoring.`, so the full Chrome extension UI/CDP pass remains deferred.

## Firefox Scope

Available:

- Firefox package generation from shared extension source.
- Firefox manifest transformation with Gecko settings and data collection
  declaration.
- Local server health and MCP status checks from Firefox/Zen.
- Content script injection with clone-safe generated script completions.
- Annotation creation, deletion, image upload, and MCP image payloads.
- Visible-tab screenshot capture and content-side cropping for visible areas.
- Console, page error, promise rejection, network metadata, and backend log
  capture through Firefox-supported fallbacks.

Unavailable or degraded:

- Chrome debugger/CDP responsive viewport emulation.
- CDP full-page or beyond-viewport screenshot capture.
- CDP-level network response body capture.
- Exact Chrome CDP timeline parity.

## Permission Notes

The Firefox artifact requests `activeTab`, `storage`, and `scripting` API
permissions. It removes Chrome-only `debugger` and broad `tabs` permissions.

The Firefox artifact includes local-development host permissions and
`<all_urls>`. `<all_urls>` is required for reliable persistent in-page
`tabs.captureVisibleTab` screenshots after navigation or toolbar auto-reopen,
where a temporary `activeTab` grant may no longer be present.

## Remaining Risks

- AMO may require additional dynamic `innerHTML` cleanup before listed release.
- Chrome regression has not received a full interactive annotation/screenshot/CDP
  pass after the shared-source Firefox changes because the available Google
  Chrome runtime rejects unpacked extension loading from automation.
- Firefox issue-recording console/error evidence has implementation and isolated
  validation coverage, but no persisted local issue report was present during
  final closeout.

## Release Gate

Internal beta: ready.

Public listed release: defer until:

- Chrome regression pass is completed in a real Chrome profile.
- AMO warning cleanup is either completed or accepted with a documented reviewer
  rationale.
- Manual QA matrix rows for annotation screenshot and issue evidence are filled
  with final pass/fail notes.
