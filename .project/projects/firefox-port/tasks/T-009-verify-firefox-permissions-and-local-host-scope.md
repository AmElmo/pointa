---
id: T-009
name: Verify Firefox permissions and local host scope
status: done
workstream: WS-002
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T21:36:41Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001, T-006]
conflicts_with: []
parallel: true
priority: medium
estimate: S
story_id: US-004
acceptance_criteria_ids: [AC-005]
---

# Task: Verify Firefox permissions and local host scope

## Description

Finalize Firefox permissions and local host patterns needed for annotation, screenshots, server fetches, and evidence capture.

## Acceptance Criteria

- [x] Firefox manifest permissions are minimal for the MVP feature set.
- [x] Localhost host permissions are documented with rationale.
- [x] Permission choices are reflected in AMO/privacy planning notes.

## Traceability
- Story: US-004
- Acceptance criteria: AC-005

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T21:36:41Z: Permission scope updated after Zen screenshot smoke: Firefox artifact now keeps activeTab/storage/scripting API permissions, removes debugger/tabs, and adds <all_urls> host permission because MDN requires <all_urls> or activeTab for tabs.captureVisibleTab and persistent toolbar screenshots cannot depend on activeTab after navigation. Updated Firefox port, release, privacy, evidence, QA, and spec notes.

- 2026-05-29T19:54:02Z: Firefox manifest generation now removes Chrome-only debugger and broad tabs permissions, leaving activeTab/storage/scripting plus local-development host permissions. Documented local host rationale and AMO permission notes in docs/FIREFOX_PORT.md and docs/FIREFOX_RELEASE.md. Verified node --check scripts/build-firefox-extension.js, npm run firefox:lint exits 0, and dist/firefox/manifest.json contains only activeTab/storage/scripting permissions.

- 2026-05-29T19:53:19Z: Finalizing Firefox permission and local host scope now that background injection is implemented

- 2026-05-29T19:51:28Z: Dependencies T-001 and T-006 are done; permission scope verification is unblocked
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
