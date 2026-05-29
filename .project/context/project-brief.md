# Project Brief

## Problem
- Developers using AI coding agents often lose precision when describing visual
  UI feedback, bugs, or performance issues. Pointa closes that gap by capturing
  element selectors, screenshots, URL context, timelines, backend logs, and
  structured MCP data from local development pages.
- Delano is being used here to make repo context, delivery state, and agent
  operating rules explicit before future implementation work continues.

## Target Outcome
- The current context-management scope is complete when all files under
  `.project/context/` describe Pointa's real product, architecture, workflows,
  validation expectations, and unresolved gaps without template markers.
- A new agent should be able to resume work by reading this context pack,
  `AGENTS.md`, and the repo docs without guessing what the product is or how it
  is structured.

## Scope Boundaries
- In scope: context pack maintenance, Delano runtime validation, future project
  contracts in `.project/projects/`, extension/server implementation work,
  release workflow maintenance, and evidence-backed product documentation.
- Out of scope for this context refresh: changing Pointa product behavior,
  creating Chrome Web Store assets, publishing npm or Chrome releases, opening
  remote PRs, or inventing delivery plans without explicit project contracts.
