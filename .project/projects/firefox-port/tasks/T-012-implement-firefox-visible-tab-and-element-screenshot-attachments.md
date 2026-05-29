---
id: T-012
name: Implement Firefox visible-tab and element screenshot attachments
status: done
workstream: WS-003
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T21:36:41Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-008, T-010]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-001
acceptance_criteria_ids: [AC-003]
---

# Task: Implement Firefox visible-tab and element screenshot attachments

## Description

Use Firefox-supported visible tab capture and content-side cropping to attach screenshots to annotations or reports.

## Acceptance Criteria

- [x] Firefox can attach a visible-tab screenshot to an annotation or report.
- [x] Element-level screenshot crop uses captured image plus element geometry when available.
- [x] Screenshot failures return actionable errors without losing the annotation.

## Traceability
- Story: US-001
- Acceptance criteria: AC-003

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T21:36:41Z: Follow-up from regular-profile Zen smoke: screenshot attach failed because persistent in-page toolbar capture cannot rely on a stale activeTab grant. Firefox build now includes <all_urls> host permission for visible-tab capture, captureVisibleTab no longer passes undefined as windowId, and annotation screenshot UI surfaces structured background errors instead of a generic message. Verified node --check, firefox:lint, firefox:package, generated manifest, and local server health.

- 2026-05-29T20:22:35Z: captureScreenshot now accepts sender tab/window context, uses Firefox-supported tabs.captureVisibleTab without tabs.get, preserves Chrome debugger capture only when available, and returns structured NO_ACTIVE_TAB/CAPTURE_VISIBLE_TAB_UNAVAILABLE/permission/restricted-page errors. Content-side element crop remains driven by captured image plus element geometry. node --check passed for background.js; npm run firefox:lint exits 0 with known warning baseline; docs/FIREFOX_EVIDENCE_CAPTURE.md documents structured screenshot failure behavior.

- 2026-05-29T20:22:23Z: Screenshot worker completed implementation and parent review/validation passed.

- 2026-05-29T20:06:57Z: Dependencies T-008 and T-010 are done; Firefox screenshot attachment work is unblocked
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
