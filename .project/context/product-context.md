# Product Context

## Users
- Primary users are developers working on localhost web apps who want precise,
  visual feedback loops with AI coding agents.
- Secondary users are maintainers publishing the Chrome extension, Firefox/Zen
  package, and `pointa-server` npm package.
- AI coding agents consume Pointa through MCP tools and need URL-filtered,
  token-efficient annotation or issue-report data.

## Core Flows
- Install the Pointa browser extension, configure an MCP-capable editor to run
  `npx -y pointa-server` or connect to `http://127.0.0.1:4242/mcp`, then annotate
  localhost pages.
- Create annotations by clicking UI elements, storing selectors, messages,
  element context, optional images, and status transitions from `pending` to
  `in-review` to `done`.
- Capture bug and performance reports with screenshots, console/network/user
  interaction timelines, and optional backend logs when the app is launched via
  `pointa-server dev` or `pointa dev` documentation examples.
- Use design mode and inspiration capture to record visual changes or external UI
  references with richer styling metadata and screenshots.
- Let AI agents read Pointa MCP data, implement code changes in the target
  project, and mark annotations or issues for human review.
- Use demo fixtures to load six pending annotations and three active reports
  against `testing/demo-app/index.html` for demos and QA.

## Constraints
- Local-first privacy is central: Pointa stores project feedback and screenshots
  locally and should not send data to external services except explicit user
  integrations such as Linear issue creation.
- Annotation features are intentionally focused on local development URLs.
- Cross-project safety matters: MCP annotation reads should filter by URL when
  multiple localhost projects exist.
- The Chrome `debugger` permission is sensitive and must remain narrowly used and
  well justified. Firefox/Zen builds do not expose Chrome CDP-only capabilities.
- Shadow DOM elements are a known limitation for annotation targeting.
- Chrome/Chromium browsers are supported through the Chrome package.
- Firefox/Zen support is available through the generated beta package, with
  responsive viewport capture and other CDP-only features unavailable.
