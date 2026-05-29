# Development Guide

## Repository Structure

```
pointa-app/
├── extension/              # Browser extension
│   ├── manifest.json       # Extension configuration
│   ├── background/         # Service worker
│   ├── content/            # Content scripts
│   │   └── modules/        # Feature modules
│   ├── popup/              # Extension popup UI
│   └── assets/             # Icons and fonts
│
├── annotations-server/     # MCP server (npm package)
│   ├── bin/cli.js          # CLI entry point
│   ├── lib/server.js       # Server implementation
│   └── package.json        # Server package config
│
└── docs/                   # Documentation
```

## Tech Stack

**Extension:**
- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- CSS with custom properties for theming

**Server:**
- Node.js with Express
- MCP SDK (`@modelcontextprotocol/sdk`)
- File-based storage (node-persist)

## Extension Development

### Initial Setup

1. **Load the Extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **"Load unpacked"**
   - Select the `/extension` directory from this repository
   - The extension should now appear in your extensions list

2. **Verify Installation:**
   - You should see "Pointa" in your extensions list
   - Click the extension icon in the Chrome toolbar to open the popup
   - The extension should work on localhost URLs (e.g., `http://localhost:3000`)

### Real-Time Testing Workflow

Chrome automatically reloads certain extension files when you make changes, but here's how to test different parts:

#### **Popup Changes** (popup.html, popup.js, popup.css)
- Make your changes to the files
- **Reload the extension:**
  - Go to `chrome://extensions/`
  - Find "Pointa" and click the **refresh/reload icon** 🔄
- **Reopen the popup** to see your changes

#### **Content Script Changes** (content.js, content.css)
- Make your changes to the files
- **Reload the extension:**
  - Go to `chrome://extensions/`
  - Find "Pointa" and click the **refresh/reload icon** 🔄
- **Refresh the page** where the extension is active (e.g., `http://localhost:3000`)
- The new content scripts will load automatically

#### **Background Script Changes** (background.js)
- Make your changes to the file
- **Reload the extension:**
  - Go to `chrome://extensions/`
  - Find "Pointa" and click the **refresh/reload icon** 🔄
- The background service worker will restart automatically

#### **Manifest Changes** (manifest.json)
- Make your changes to the file
- **Reload the extension:**
  - Go to `chrome://extensions/`
  - Find "Pointa" and click the **refresh/reload icon** 🔄
- You may need to refresh any pages where the extension is active

### Quick Reload Shortcut

For faster iteration, you can:
1. Keep `chrome://extensions/` open in a separate tab
2. Use the refresh button on the extension card after each change
3. Keep your test page open and refresh it when testing content scripts

### Debugging

#### **View Console Logs:**
- **Popup:** Right-click the extension icon → "Inspect popup" (or click the "service worker" link for background)
- **Content Script:** Open DevTools on your test page (F12) → Console tab
- **Background Script:** Go to `chrome://extensions/` → Find "Pointa" → Click "service worker" link

#### **Check Extension Errors:**
- Go to `chrome://extensions/`
- Look for any error messages in red on the extension card

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup opens and displays correctly
- [ ] Content scripts work on localhost pages
- [ ] Background script functions properly
- [ ] No console errors in DevTools

## Local Server Development  

```bash
cd annotations-server
npm install
npm run dev  # Runs with auto-restart on file changes
```

The server will run on `http://127.0.0.1:4242` by default.

## Testing

Test on common localhost setups:
- React: localhost:3000
- Vite: localhost:5173  
- Next.js: localhost:3000
- Vue: localhost:8080

### Full Testing Setup

1. **Start the server:**
   ```bash
   cd annotations-server
   npm run dev
   ```

2. **Load the extension** (see Extension Development section above)

3. **Open a test page** (e.g., `http://localhost:3000`)

4. **Test the extension:**
   - Click the extension icon to open popup
   - Click elements on the page to create annotations
   - Verify annotations are saved and displayed

## Firefox Extension Development

Firefox builds are generated from the shared `extension/` source into
`dist/firefox/`. The Chrome manifest remains the source for the Chrome package;
the Firefox build script writes a browser-specific manifest with Gecko settings,
Firefox background scripts, and without Chrome-only permissions.

See `docs/FIREFOX_PORT.md` for the package architecture, lint baseline, and
release notes.

```bash
npm run firefox:build    # Generate dist/firefox/
npm run firefox:lint     # Build, then run web-ext lint against dist/firefox/
npm run firefox:run      # Build, then launch Firefox with the generated add-on
npm run firefox:package  # Build an unsigned Firefox package under dist/firefox-artifacts/
```

Current expected lint baseline during the port:

- `firefox:lint` must have zero errors.
- Static warnings for `chrome.debugger` calls are expected in the generated
  Firefox build, but runtime code gates these paths behind capability checks.
- `innerHTML` warnings are tracked in the AMO-readiness audit before public
  Firefox submission.

Firefox uses visible-tab screenshots and page-level console/error/network
instrumentation where Chrome can use browser-level debugging APIs. Responsive
viewport capture is hidden in Firefox because the generated package cannot
emulate viewport sizes there. See `docs/FIREFOX_EVIDENCE_CAPTURE.md` for the
Available, Approximate, and Unavailable evidence matrix.

When testing locally, start the Pointa server first:

```bash
cd annotations-server
npm run dev
```

Then run the Firefox add-on and test a localhost page, for example:

```bash
python3 -m http.server 8080
npm run firefox:run
```

Open `http://localhost:8080/testing/demo-app/index.html` in the launched Firefox
profile and verify toolbar/sidebar injection, annotation creation, screenshot
capture, and server offline/online behavior.
