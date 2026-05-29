---
name: Firefox Extension Port
slug: firefox-port
owner: team
created: 2026-05-29T19:06:15Z
updated: 2026-05-29T19:27:25Z
---

# Decisions: Firefox Extension Port

## Active Decisions
- Use generated browser-specific packaging for Firefox instead of making the
  current Chrome `extension/manifest.json` serve every browser directly.
- Build Firefox in staged parity: first load/inject/connect/lint, then full core
  annotation parity, then Firefox-supported screenshots and evidence capture.
- Treat `chrome.debugger` behavior as Chrome-only until a supported Firefox
  replacement is proven.
- Add `web-ext lint` and `web-ext run` to the Firefox validation workflow.
- Use page instrumentation, `webRequest`, visible-tab screenshots, and backend
  logs as the Firefox evidence-capture strategy.
- Keep Chrome regression checks as a required gate after shared extension code
  changes.

## Superseded Decisions
- None.

## Open Decision Questions
- Minimum Firefox version target.
- Firefox desktop only versus desktop plus Android.
- AMO-listed versus self-distributed signed XPI release.
- Whether to add `webRequest` permission for Firefox issue-report timelines.
- Whether to refactor all AMO linter `innerHTML` warnings before first Firefox
  submission.
