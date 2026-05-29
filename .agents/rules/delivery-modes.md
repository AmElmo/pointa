# Delano operating modes

Use operating modes to choose the lightest safe delivery contract. The mode should reduce ambiguity, not add ceremony.

| Mode | Slug | Name | Best fit | Minimum contract |
| --- | --- | --- | --- | --- |
| 0 | patch | Patch | Tiny, low-risk fix with obvious validation | Focused change plus validation evidence |
| 1 | scoped-change | Scoped change | Bounded task with clear acceptance criteria | Task contract, acceptance criteria, local validation |
| 2 | feature | Feature | Multi-step delivery with clear solution direction | Spec/plan, task sequence or workstream, validation gate |
| 3 | uncertain-feature | Uncertain feature | Feature with meaningful unknowns | Uncertainty statement, probe decision, probe evidence before build commitment |
| 4 | multi-stream | Multi-stream delivery | Concurrent streams or coordination/collision risk | Workstream map, conflict zones or leases, handoff summaries, sync/drift checks when relevant |

## Validation posture

`operating-modes.json` is the canonical machine-readable contract. `npm run check:operating-modes` verifies that modes 0 through 4 are present, ordered, uniquely named, and documented with requirements.

Modes are additive for now. Existing artifacts do not need an `operating_mode` field until stricter migration work lands.
