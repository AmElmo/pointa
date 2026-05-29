# Firefox Release Path

This document records the current release decision for the Firefox port. It does
not publish anything by itself.

## Distribution Decision

Initial target: **internal/beta Firefox package first**, then decide between
listed AMO and unlisted self-distributed signing after smoke testing and AMO risk
review.

Rationale:

- The current Firefox package lints with zero errors, but still has known warning
  classes for `chrome.debugger` references and dynamic `innerHTML` assignments.
- The Firefox evidence model intentionally differs from Chrome CDP behavior.
- A signed internal/beta artifact lets maintainers test install, localhost
  permissions, screenshots, annotations, and evidence capture before public
  listing copy is finalized.

## Required Accounts and Credentials

Release signing requires Mozilla Add-ons credentials owned by a maintainer:

- AMO issuer / API key
- AMO secret
- stable Gecko add-on ID, currently generated as `pointa@pointa.dev`

Do not commit signing credentials. They should be supplied through environment
variables or a CI secret store.

## Build and Package Commands

Generate the Firefox source package:

```bash
npm run firefox:build
```

Run Firefox lint:

```bash
npm run firefox:lint
```

Create an unsigned zip artifact:

```bash
npm run firefox:package
```

Current unsigned output path:

```text
dist/firefox-artifacts/pointa-1.3.6.zip
```

Signing should use the generated Firefox source or package through `web-ext sign`
once the maintainer credentials and distribution channel are selected.

## Release Blockers

- T-006: Firefox background/action injection must be smoke-tested.
- T-007: local server URL and health handling must be centralized.
- T-009: Firefox permissions and local host scope must be finalized.
- T-020: Firefox evidence parity/degraded-state matrix in
  `docs/FIREFOX_EVIDENCE_CAPTURE.md` must be current.
- T-023: Firefox `web-ext run` demo smoke test must pass.
- T-024: Chrome regression check must pass after shared-code changes.
- T-025: AMO `innerHTML` warning audit must have dispositions.
- T-028: data collection and privacy declaration must match actual behavior.
- T-029: release readiness report must recommend release, beta, or defer.

## Public Listing Notes

If the project chooses listed AMO distribution, listing copy must describe:

- local-first storage and `pointa-server` on `127.0.0.1:4242`;
- local development host permissions plus `<all_urls>` for persistent
  visible-tab screenshot capture, with no Firefox `tabs` permission in the
  generated package;
- screenshots and annotation data stored locally;
- console/error/network/backend evidence capture only when recording is active;
- Firefox-specific limitations for CDP-only Chrome features such as responsive
  viewport emulation.
- privacy and data collection behavior from
  `docs/FIREFOX_PRIVACY_DECLARATION.md`, including local-first storage, MCP AI
  tool sharing, and optional Linear export behavior.

QA and listing copy should use the Available, Approximate, and Unavailable labels
from `docs/FIREFOX_EVIDENCE_CAPTURE.md` so Firefox limitations are described
consistently across testing, release notes, and user-facing degraded states.
See `docs/FIREFOX_RELEASE_READINESS.md` for the current closeout decision,
validation evidence, remaining risks, and public-release gate.

## AMO Permission Notes

The generated Firefox package requests `activeTab`, `storage`, and `scripting`,
plus local-development host permissions and `<all_urls>`. `activeTab` is used for
toolbar-click access; `<all_urls>` is used for reliable persistent visible-tab
screenshot capture after navigation or toolbar auto-reopen; local host
permissions are used for annotation pages and `pointa-server` communication. The
Chrome-only `debugger` and broad `tabs` permissions are removed from the Firefox
artifact.

The generated manifest declares required Firefox data collection permissions for
`websiteActivity` and `websiteContent`; see
`docs/FIREFOX_PRIVACY_DECLARATION.md` for the release wording and integration
data-handling notes.
