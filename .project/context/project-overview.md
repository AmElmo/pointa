# Project Overview

## Mission
Pointa helps developers point at UI elements in local web apps, leave visual
feedback, capture bugs or performance issues, and let MCP-capable AI coding
agents read the exact context needed to implement changes.

The repository ships two coupled products:

- A Chromium Manifest V3 extension in `extension/`.
- A local Node.js MCP and HTTP server published as `pointa-server` from
  `annotations-server/`.

## Active Delivery Scopes
- No `.project/projects/*` Delano project contracts exist yet.
- Delano runtime and context management have been added to this repo under
  `.agents/`, `.project/`, `.codex/`, `.delano/`, `AGENTS.md`, and `HANDBOOK.md`.
- Future scoped work should create explicit Delano project contracts before
  tracking workstreams or task state.

## Current Health
- Delano validation passes after context refresh, with the expected warning that
  `.claude` compatibility runtime is absent while `.agents` is canonical.
- Product docs and source agree on the main architecture: local-first extension,
  server on port `4242`, file-backed user data under `~/.pointa/`, and MCP tools
  for annotations and issue reports.
- Main context gaps: no active Delano project/task contracts, no committed
  automated test suite beyond lint and a stub server test script, and
  Chrome Web Store submission notes still list production readiness items such
  as debugger permission justification, store assets, and console-log cleanup.
