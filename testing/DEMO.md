# Demo & QA Fixtures

Pre-built annotations and bug reports for product demos and QA testing.

## Quick Start

```bash
# 1. Load demo fixtures
./scripts/load-demo.sh

# 2. Start the Pointa server (in one terminal)
cd annotations-server && npm run dev

# 3. Serve the demo page (in another terminal, from repo root)
python3 -m http.server 8080

# 4. Open in Chrome with Pointa extension enabled
open http://localhost:8080/testing/demo-app/index.html
```

## What You'll See

### 6 Annotations (pending)

| Element | Feedback |
|---------|----------|
| Hero CTA button | Change copy to be more compelling |
| Hero subtitle | Fix spacing below subtitle |
| Feature card heading | Font weight should be bolder |
| Pro pricing card | Make it stand out more as recommended |
| Stats number (99.2%) | Use brand gradient text effect |
| Nav logo | Adjust letter-spacing and font-size |

### 3 Bug Reports (active)

| Bug | Type |
|-----|------|
| Pricing toggle TypeError | JS console error |
| Contact form 404 | Network request failure |
| Scroll jank | Performance warning |

## Cleanup

```bash
./scripts/clear-demo.sh
```

This restores your original `~/.pointa/` data from the backup created by `load-demo.sh`.

## Creating Custom Fixtures

Fixture files live in `testing/fixtures/demo/`. To create your own:

1. Copy an existing fixture file as a starting point
2. Update the `url` field to match your test page
3. Update `selector` fields to match your page elements (use `#id` selectors for reliability)
4. Run `./scripts/load-demo.sh --force` to reload

### Annotation format (lean)

```json
{
  "id": "pointa_{timestamp}_{random}",
  "url": "http://localhost:8080/your-page.html",
  "selector": "#element-id",
  "comment": "Your feedback text",
  "element_context": {
    "tag": "div",
    "classes": ["class-name"],
    "text": "Element text content"
  },
  "status": "pending",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z",
  "data_format": "lean"
}
```

### Bug report format

```json
{
  "id": "BUG-{timestamp}",
  "report": { "expectedBehavior": "Description" },
  "context": {
    "page": { "url": "http://localhost:8080/your-page.html" },
    "browser": "Chrome 133 / macOS"
  },
  "recordings": [{ "timeline": { "events": [...] } }],
  "status": "active",
  "created": "2026-01-01T00:00:00.000Z"
}
```

## Troubleshooting

**Annotations don't appear in the extension**
- Is the Pointa server running? Check `http://127.0.0.1:4242`
- Is the page served on `http://localhost:8080`? The URL must match exactly
- Is the extension enabled on localhost? Check extension permissions

**`load-demo.sh` says backup already exists**
- Run `./scripts/clear-demo.sh` first, or use `./scripts/load-demo.sh --force`

**Port 8080 is in use**
- Use a different port: `python3 -m http.server 9090`
- But you'll need to update the `url` fields in the fixture JSON files to match

**MCP tools don't return the fixtures**
- Restart the Pointa server after loading fixtures
- Use `read_annotations` with `url: "http://localhost:8080"` to filter
