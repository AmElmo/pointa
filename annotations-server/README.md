# pointa-server

Global MCP server for Pointa browser extension.

> **Note:** This is a CLI tool. Install globally with:
> ```bash
> npm install -g pointa-server
> ```
> Or use with `npx` (no install needed): `npx pointa-server start`

## Quick Start

No installation required! Just add the MCP server to your AI coding tool:

### Cursor (Recommended)

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

That's it! The server will auto-start when Cursor opens and works with the Chrome extension.

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

## Chrome Extension

Install the companion browser extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/pointa/chfdkemckcihigkepbnpegcopkncoane).

## License

MIT