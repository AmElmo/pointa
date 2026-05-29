---
id: T-003
name: Resolve Firefox manifest lint errors
status: done
workstream: WS-001
created: 2026-05-29T19:26:26Z
updated: 2026-05-29T19:35:08Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001, T-002]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-002
acceptance_criteria_ids: [AC-001, AC-005]
---

# Task: Resolve Firefox manifest lint errors

## Description

Drive the generated Firefox package to zero web-ext lint errors and document remaining warnings.

## Acceptance Criteria

- [x] web-ext lint exits with zero errors for the Firefox output.
- [x] Any remaining web-ext warnings are captured with owner and disposition.
- [x] The baseline no longer reports missing background fallback or missing Gecko ID.

## Traceability
- Story: US-002
- Acceptance criteria: AC-001, AC-005

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T19:35:08Z: npm run firefox:lint exits with 0 errors against dist/firefox; generated Firefox manifest no longer reports missing background fallback, missing Gecko ID, or invalid debugger permission; remaining warning classes are documented with owner/disposition in docs/FIREFOX_PORT.md.

- 2026-05-29T19:34:38Z: Document and verify Firefox lint baseline after build tooling

- 2026-05-29T19:34:34Z: Dependencies T-001 and T-002 are done; manifest lint cleanup task is ready
- 2026-05-29T19:26:26Z: Created from .project/templates/task.md by `delano task add`.
