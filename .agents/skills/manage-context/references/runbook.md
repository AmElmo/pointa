# Context Runbook

1. Read `.project/context/README.md` to confirm the expected context pack shape.
2. Review all current `.project/context/*.md` files.
3. Cross-check the context pack against the active source of truth:
   - `.project/projects/<slug>/spec.md`
   - `.project/projects/<slug>/plan.md`
   - `.project/projects/<slug>/workstreams/*.md`
   - `.project/projects/<slug>/decisions.md`
   - recent task state, code changes, and review feedback
4. Mark context debt before editing:
   - stale claims
   - template placeholders
   - contradictory terminology
   - missing constraints or ownership
   - progress statements without evidence
5. Repair only what the evidence supports.
6. Record unresolved contradictions or evidence gaps explicitly.
7. Validate:
   - `bash .agents/scripts/pm/validate.sh`
   - `bash .agents/scripts/pm/status.sh`

Exit gate:
- context pack is trustworthy enough for handoff or resumed execution
- open uncertainty is visible
- no placeholder text remains in edited sections
