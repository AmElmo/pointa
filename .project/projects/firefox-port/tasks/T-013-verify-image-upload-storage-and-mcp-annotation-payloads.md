---
id: T-013
name: Verify image upload storage and MCP annotation payloads
status: done
workstream: WS-003
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T20:25:17Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-012]
conflicts_with: []
parallel: true
priority: medium
estimate: M
story_id: US-001
acceptance_criteria_ids: [AC-002, AC-003]
---

# Task: Verify image upload storage and MCP annotation payloads

## Description

Confirm Firefox screenshot attachments are stored by pointa-server and readable through MCP annotation image tools.

## Acceptance Criteria

- [x] Uploaded Firefox screenshots are stored under existing server image paths.
- [x] MCP annotation data reports has_images and image paths correctly.
- [x] get_annotation_images returns the Firefox-created image data successfully.

## Traceability
- Story: US-001
- Acceptance criteria: AC-002, AC-003

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T20:25:17Z: Isolated server smoke with temporary HOME and POINTA_PORT uploaded a PNG through /api/upload-image, saved an annotation with reference_images, confirmed MCP read_annotations and read_annotation_by_id returned has_images=true/image_count=1/image_paths, and confirmed get_annotation_images returned data:image/png;base64 data. docs/FIREFOX_EVIDENCE_CAPTURE.md now records the image/MCP payload path.

- 2026-05-29T20:23:00Z: T-012 is done; verifying screenshot upload/storage/MCP payload path.
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
