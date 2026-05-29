---
id: WS-003
name: WS-003 Annotation Element Anchoring and Screenshots
owner: extension-team
status: done
created: 2026-05-29T19:25:23Z
updated: 2026-05-29T20:26:48Z
---

# Workstream: WS-003 Annotation Element Anchoring and Screenshots

## Objective
Deliver the core Pointa value in Firefox: annotate web UI, keep annotations
linked to the intended element, attach screenshots, store image evidence through
`pointa-server`, and verify MCP can retrieve Firefox-created image data.

## Owned Files/Areas
- `extension/content/content.js`
- `extension/content/modules/annotation-*`
- `extension/content/modules/selector-generator.js`
- `extension/content/modules/element-finder.js`
- `extension/content/modules/image-uploader.js`
- `extension/content/modules/design-*`
- `extension/content/modules/inspiration-mode.js`
- `annotations-server/lib/server.js` image and annotation endpoints as needed
- Delano tasks T-010 through T-014

## Dependencies
- WS-002 runtime injection and local server compatibility
- Existing annotation and image upload API behavior
- Firefox `tabs.captureVisibleTab`

## Risks
- Selector behavior can be brittle across DOM changes.
- Firefox screenshot permissions and visible-tab limitations may not match Chrome
  CDP capture.
- Design and inspiration modes may expose hidden Chrome assumptions.

## Handoff Criteria
- Firefox can create, display, update, and delete annotations on a localhost page.
- Annotations retain enough element context for robust fallback matching.
- Screenshot attachments save and are retrievable through MCP image tooling.
- Design/inspiration compatibility is validated or explicitly scoped.
