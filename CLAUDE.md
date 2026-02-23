# Pointa Project Context

## Project Overview

**Pointa** is a Chrome extension + local MCP server for AI-powered development annotations. Point at any UI element, leave feedback, and let AI implement changes.

- **Chrome Extension** (Manifest V3) — Runs in browser, captures annotations, bugs, performance issues
- **MCP Server** (`pointa-server` npm package) — Local Node.js server that runs on developer's machine
- **Monorepo** — Both live in this single repo

## Architecture

```
pointa-app/
├── extension/              # Chrome extension (Manifest V3)
│   ├── manifest.json       # Extension config (VERSION synced here)
│   ├── background/         # Service worker
│   ├── content/            # Content scripts + CSS
│   └── popup/              # Extension popup UI
├── annotations-server/     # npm package "pointa-server"
│   ├── package.json        # (VERSION synced here)
│   ├── lib/server.js       # Main MCP server
│   └── bin/cli.js          # CLI entry point
├── package.json            # Root workspace (VERSION synced here)
├── .releaserc.json         # Semantic-release config
├── scripts/
│   └── sync-versions.js    # Updates versions in all 3 files
└── CHANGELOG.md            # Auto-generated release notes
```

## Release & Versioning

**Trigger:** Merge PR to `main` with conventional commit messages.

**Semantic-release automatically:**
1. Analyzes commit messages (feat/fix/etc)
2. Determines version bump (major/minor/patch)
3. Runs `scripts/sync-versions.js` to bump all 3 files
4. Builds extension zip
5. Publishes `pointa-server` to NPM
6. Creates GitHub Release with extension zip attached
7. Commits version bumps to git with `[skip ci]`

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types that trigger releases:**
- `feat:` → MINOR bump (1.2.0 → 1.3.0)
- `fix:` / `perf:` / `refactor:` → PATCH bump (1.2.0 → 1.2.1)
- `feat!:` or `BREAKING CHANGE:` → MAJOR bump (1.2.0 → 2.0.0)

**Types that DON'T release:**
- `docs:` / `chore:` / `ci:` / `test:` / `style:` — no version bump

**Examples:**
```
feat: add fallback handling for removed elements
fix: correct sidebar CSS isolation with Shadow DOM
docs: update README with backend log setup
chore(release): 1.2.0 [skip ci]
```

## Version Sync

All three locations are kept in sync by `scripts/sync-versions.js`:
- `package.json` (root)
- `annotations-server/package.json`
- `extension/manifest.json`

This runs automatically during release. If you ever need to manually sync versions:
```bash
node scripts/sync-versions.js <version>
```

## Key Files

- **`.releaserc.json`** — Semantic-release pipeline config
- **`.github/workflows/release.yml`** — CI/CD workflow (runs on push to main)
- **`scripts/sync-versions.js`** — Version synchronization script
- **`CHANGELOG.md`** — Release notes (auto-generated)
- **`extension/manifest.json`** — Extension metadata + version
- **`annotations-server/package.json`** — NPM package config + version

## NPM Publishing

The `pointa-server` package is published to npm at:
- https://www.npmjs.com/package/pointa-server
- Users install: `npm install -g pointa-server` or `npx pointa-server`

**Not auto-published to Chrome Web Store** — that's manual (download zip from GitHub Release, upload to Web Store).

## Development

```bash
# Install server deps
cd annotations-server
npm install

# Run server locally (watches for changes)
npm run dev

# Lint
npm run lint
npm run lint:fix
```

## Git Workflow

- **Commit after every completed unit of work.** Never let changes accumulate.
- After implementing a feature, fixing a bug, or completing any discrete task, immediately stage and commit with a clear, conventional commit message.
- Commit granularity: prefer small, atomic commits (one logical change per commit).
- Format: `type(scope): description` (e.g., `feat(auth): add login endpoint`, `fix(ui): correct button alignment`)
- Never wait for the user to ask you to commit. Committing is part of completing the task.
- Do NOT bundle unrelated changes into a single commit.

## Workflow

1. Create feature branch from `main`
2. Make changes, commit with conventional messages
3. Push to origin, open PR
4. Get review, merge to `main`
5. Semantic-release automatically triggers, creates version + release
