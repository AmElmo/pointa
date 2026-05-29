# Execution Runbook

1. Pick dependency-safe task:
   - `bash .agents/scripts/pm/next.sh`
2. Set task status to `in-progress`.
3. Execute implementation in owned boundaries.
4. Record updates in `.project/projects/<slug>/updates/...`.
5. Surface blockers immediately:
   - `bash .agents/scripts/pm/blocked.sh`
6. Review active work:
   - `bash .agents/scripts/pm/in-progress.sh`

Exit gate:
- Work complete per acceptance criteria
- Evidence log updated
- Task ready for quality/review
