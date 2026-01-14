# pointa-server

MCP server for [Pointa](https://chromewebstore.google.com/detail/pointa/chfdkemckcihigkepbnpegcopkncoane) — a Chrome extension that lets you leave visual annotations on your localhost for AI coding agents to pick up and implement.

Point at UI issues, add comments, and your AI agent sees exactly what you see.

> **Note:** This is a CLI tool. Install globally with:
> ```bash
> npm install -g pointa-server
> ```
> Or use with `npx` (no install needed): `npx pointa-server start`

## Quick Start

No installation required! Just add the MCP server to your AI coding tool:

### Claude Code

```bash
claude mcp add --transport http pointa http://127.0.0.1:4242/mcp
```

Then start the server: `npx pointa-server start`

### Cursor

1. Open Cursor → Settings → Cursor Settings
2. Go to the Tools & Integrations tab
3. Click + Add new global MCP server
4. Enter the following configuration and save:

```json
{
  "mcpServers": {
    "pointa": {
      "command": "npx",
      "args": ["-y", "pointa-server"]
    }
  }
}
```

The server will auto-start when Cursor opens.

---

## Port Configuration (Optional)

By default, the server runs on port **4242** (a nod to "42" - the answer to life, the universe, and everything 🌌).

If this port is already in use, you can change it:

```bash
# Use a custom port
POINTA_PORT=4243 pointa-server start

# Or set it permanently in your shell config
export POINTA_PORT=4243
```

**Note:** If you change the port, you'll also need to update:
1. Chrome extension settings (to connect to the new port)
2. Any custom configurations pointing to the server

---

## Manual Server Management (Optional)

For advanced users who want to manually control the server:

### Start the server

```bash
npx pointa-server start
```

The server will run in the background on port 4242.

### Stop the server

```bash
npx pointa-server stop
```

### Check server status

```bash
npx pointa-server status
```

### Restart the server

```bash
npx pointa-server restart
```

### View logs

```bash
npx pointa-server logs
# or follow logs
npx pointa-server logs -f
```

---

## AI Coding Agent Integration

The server supports multiple AI coding tools via MCP (Model Context Protocol).

### Claude Code

**Option 1: Manual start** (recommended for Claude Code):

```bash
# Start server once
npx pointa-server start

# Then add MCP connection
claude mcp add --transport http pointa http://127.0.0.1:4242/mcp
```

**Option 2: Auto-start** (experimental):
```bash
claude mcp add --transport stdio pointa -- npx -y pointa-server
```

### Cursor (Auto-start)

**Recommended setup** - server starts automatically:

```json
{
  "mcpServers": {
    "pointa": {
      "command": "npx",
      "args": ["-y", "pointa-server"]
    }
  }
}
```

**Alternative** - manual server management:

First start the server manually: `npx pointa-server start`

Then use:
```json
{
  "mcpServers": {
    "pointa": {
      "url": "http://127.0.0.1:4242/mcp"
    }
  }
}
```

### Windsurf

**Recommended setup** - server starts automatically:

```json
{
  "mcpServers": {
    "pointa": {
      "command": "npx",
      "args": ["-y", "pointa-server"]
    }
  }
}
```

**Alternative** - manual server management:

First start the server: `npx pointa-server start`

Then use:
```json
{
  "mcpServers": {
    "pointa": {
      "serverUrl": "http://127.0.0.1:4242/mcp"
    }
  }
}
```

### Antigravity

1. Click on **Agent session** in Antigravity
2. Select the **"..."** dropdown → **MCP Servers** → **Manage MCP Servers**
3. Click **View raw config**
4. Edit `mcp_config.json` and add:

```json
{
  "mcpServers": {
    "pointa": {
      "command": "npx",
      "args": ["-y", "pointa-server"]
    }
  }
}
```

5. Save and restart Antigravity

### VS Code

1. Install an AI extension that supports MCP (like GitHub Copilot Chat or Continue)
2. Start the server manually: `npx pointa-server start`
3. Configure your AI extension with the MCP endpoint: `http://127.0.0.1:4242/mcp`

**Note:** MCP support and configuration varies by AI extension. Check your extension's documentation for specific setup instructions.

### Other Editors

For other code editors that support MCP:

**If your editor supports command-based MCP:**
```json
{
  "mcpServers": {
    "pointa": {
      "command": "npx",
      "args": ["-y", "pointa-server"]
    }
  }
}
```

**If your editor only supports URL-based MCP:**

Start the server manually: `npx pointa-server start`

Then configure your editor with: `http://127.0.0.1:4242/mcp`

**Note:** The Pointa MCP server supports HTTP, SSE, and stdio transports for maximum compatibility.

## MCP Tools

The server exposes the following tools via MCP for AI coding agents:

### Annotation Tools

| Tool | Description |
|------|-------------|
| `read_annotations` | Retrieves visual annotations with pagination. Supports URL filtering for multi-project safety. |
| `read_annotation_by_id` | Retrieves a single annotation by ID. |
| `mark_annotations_for_review` | Marks annotations as "in-review" after AI addresses them. |
| `get_annotation_images` | Retrieves images for an annotation as base64 data URLs. |

### Issue Report Tools

| Tool | Description |
|------|-------------|
| `read_issue_reports` | Retrieves bug reports and performance investigations with timeline data. |
| `mark_issue_needs_rerun` | Marks an issue for replay after adding debugging code. |
| `mark_issue_for_review` | Marks an issue as fixed and ready for testing. |
| `mark_issue_resolved` | Archives a resolved issue. |

### Linear Integration Tools

| Tool | Description |
|------|-------------|
| `fetch_linear_attachment` | Fetches Linear attachment content with API key authentication. |

#### `fetch_linear_attachment`

This tool solves a common problem when using Linear's MCP server: attachment URLs require authentication to access. When you sync bug reports to Linear, the debug JSON is uploaded as an attachment, but Linear's MCP server only returns the URL - not the content.

**How it works:**

1. Connect Linear in Pointa extension settings (one-time setup)
2. Your API key is automatically saved to the server config
3. Use Linear's official MCP to get an issue with attachments
4. Use `fetch_linear_attachment` with just the URL - authentication is automatic

**Parameters:**
- `url` (required): The Linear attachment URL to fetch (e.g., `https://uploads.linear.app/...`)

**Returns:**
- `content`: The attachment content (parsed JSON for .json files, text for text files, base64 for binary)
- `content_type`: MIME type of the attachment
- `encoding`: How the content is encoded (`json`, `text`, or `base64`)

**Note:** Requires Linear integration to be connected in Pointa extension settings. The API key is stored locally in `~/.pointa/config.json`.

---

## Architecture

The server provides:
- **SSE Endpoint** (`/sse`): For AI coding agent MCP connections
- **HTTP API** (`/api/annotations`): For Chrome extension communication
- **Image Upload** (`/api/upload-image`): For uploading annotation images
- **Health Check** (`/health`): For status monitoring

Data is stored in:
- Annotations: `~/.pointa/annotations.json`
- Images: `~/.pointa/images/{annotationId}/{filename}`

## Development

```bash
# Clone the repository
git clone https://github.com/AmElmo/pointa.git
cd pointa/annotations-server

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## License

MIT