# POI-10: Server Logs Capture - Investigation Document

This is a **research-only** task. No code changes will be made.

## Current State

Pointa currently captures server logs via the `pointa-server-logger` NPM package that users must install and import into their Node.js server:

```javascript
import 'pointa-server-logger';  // Side-effect import
```

**How it works:**
1. SDK intercepts `console.log/warn/error/info/debug`
2. Connects via WebSocket to `ws://127.0.0.1:4242/backend-logs`
3. Only sends logs when Chrome extension signals "recording active"
4. Logs are timestamped and included in bug report timeline

**Pain points:**
- Requires NPM package installation
- Requires code modification (import statement)
- Only works with Node.js
- Must be compatible with specific frameworks

---

## Alternative Approaches Investigated

### Option 1: CLI Wrapper + NODE_OPTIONS Injection (RECOMMENDED)

**This is the "have your cake and eat it too" solution.**

**Concept:** User runs `pointa dev npm run dev`. The CLI wrapper:
1. Sets `NODE_OPTIONS="--require /path/to/pointa-preload.js"` in the environment
2. Spawns the original command normally
3. The preload module gets loaded BEFORE the app starts
4. Preload module intercepts `console.log/warn/error` with proper level detection
5. No code changes needed in user's app

**How it works (technical details):**

From [Node.js docs](https://nodejs.org/api/cli.html): The `--require` flag "preloads the specified module at startup" and "modules are preloaded into the main thread as well as any worker threads, forked processes, or clustered processes."

From [Node.js Collection](https://medium.com/the-node-js-collection/node-options-has-landed-in-8-x-5fba57af703d): "Environment variables are inherited by child processes" - so setting `NODE_OPTIONS` means ALL Node.js processes spawned by the command will have the preload injected.

**Implementation:**
```bash
# User runs:
pointa dev npm run dev

# Internally, pointa does:
# 1. Set NODE_OPTIONS="--require /global/path/to/pointa-preload.js"
# 2. spawn('npm', ['run', 'dev'], { env: { ...process.env, NODE_OPTIONS } })
# 3. Preload script intercepts console methods with proper level detection
# 4. Forwards structured logs to ws://127.0.0.1:4242/backend-logs
```

**What the preload script does:**
```javascript
// pointa-preload.js (bundled with CLI)
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  sendToPointa({ level: 'log', message: formatArgs(args) });
  originalLog.apply(console, args);
};
console.warn = (...args) => {
  sendToPointa({ level: 'warn', message: formatArgs(args) });
  originalWarn.apply(console, args);
};
console.error = (...args) => {
  sendToPointa({ level: 'error', message: formatArgs(args), stack: new Error().stack });
  originalError.apply(console, args);
};
```

**Pros:**
- ✅ **Zero code changes** in user's app
- ✅ **One-time global install** (not per-project)
- ✅ **Proper log level detection** (intercepts at console method level)
- ✅ **Stack traces for errors**
- ✅ **Works with all Node.js frameworks** (Next.js, Express, Fastify, etc.)
- ✅ **Inherited by child processes** (webpack dev server, nodemon restarts, etc.)
- ✅ **Same log quality as current SDK**

**Cons:**
- ❌ Node.js only (for non-Node servers, falls back to raw stdout capture)
- ⚠️ User must prefix commands with `pointa dev`

**This gives us the best of both worlds for Node.js projects.**

---

### Option 1b: CLI Wrapper with Raw stdout (Fallback for Non-Node)

**For Python, Go, Ruby, etc.** - falls back to raw stdout/stderr capture with regex-based level detection.

**How it works:**
- Pointa CLI uses [node-pty](https://github.com/microsoft/node-pty) to spawn the dev server with a pseudo-terminal
- All stdout/stderr is captured and forwarded to Pointa server
- Original output still displays to user (transparent)
- Regex patterns detect common log formats: `[ERROR]`, `WARNING:`, `level=error`, etc.

**Pros:**
- Works with ANY language/framework (Python, Go, Ruby, etc.)
- Still zero code changes
- Better than nothing for non-Node projects

**Cons:**
- Less accurate level detection (regex guessing vs. actual console method)
- No stack traces unless printed to stdout

---

### Option 2: Unix `script` Command

**Concept:** Use the built-in `script` command to record terminal sessions.

```bash
script -q /dev/null npm run dev | tee >(nc localhost 4242)
```

**Pros:**
- Built-in to macOS/Linux
- No installation required

**Cons:**
- Complex invocation for users
- No WebSocket protocol support natively
- Raw terminal output with ANSI codes
- Hard to integrate with existing recording flow

**Verdict:** Too cumbersome for end users.

---

### Option 3: DTrace / System-Level Interception

**Concept:** Use macOS DTrace to intercept write() syscalls to stdout/stderr of running processes.

**Pros:**
- Could capture from already-running processes
- No code changes needed

**Cons:**
- Requires disabling System Integrity Protection (SIP) on macOS
- Security nightmare - users won't do this
- Not portable to Linux/Windows
- Requires root/sudo access

**Verdict:** Not viable due to SIP requirements.

---

### Option 4: OpenTelemetry Zero-Code Instrumentation

**Concept:** Use [OpenTelemetry auto-instrumentation](https://opentelemetry.io/docs/zero-code/js/) with `--require` flag.

```bash
node --require '@opentelemetry/auto-instrumentations-node/register' app.js
# Or via env:
NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
```

**Pros:**
- Industry standard
- No code changes in the app itself
- Rich telemetry (traces, metrics, logs)

**Cons:**
- Still requires installing `@opentelemetry/auto-instrumentations-node`
- Node.js only
- Heavy dependency (bundles many instrumentations)
- Overkill for just capturing console logs
- Logs API still "under development" per OTel docs

**Verdict:** More cumbersome than current SDK, not simpler.

---

### Option 5: IDE/Terminal Integration (VS Code, Warp, iTerm2)

**Concept:** Build extensions for terminals/IDEs that capture output from their integrated terminals.

**VS Code:**
- Has [Terminal Capture extension](https://marketplace.visualstudio.com/items?itemName=devwright.vscode-terminal-capture) concept
- BUT: [API for reading terminal content is limited](https://github.com/microsoft/vscode/issues/190941) - open feature request

**Warp Terminal:**
- Has [blocks concept](https://docs.warp.dev/terminal/blocks) grouping input/output
- BUT: No public API to programmatically read block content externally

**iTerm2:**
- Can capture sessions to files
- BUT: No real-time API for external consumption

**Pros:**
- Would be very seamless if APIs existed

**Cons:**
- APIs don't exist or are too limited
- Would need to maintain multiple integrations (VS Code, Warp, iTerm, Hyper, etc.)
- Users use many different terminals

**Verdict:** Not feasible currently due to API limitations.

---

### Option 6: Log Library Transports (Pino, Winston)

**Concept:** Provide Pino/Winston transports that ship logs to Pointa.

```javascript
// pino-pointa-transport
const logger = pino({
  transport: { target: 'pino-pointa-transport' }
});
```

**Pros:**
- Structured logs with proper levels
- Works with worker threads (Pino 7+)

**Cons:**
- Still requires code changes
- Only works if user uses that specific logging library
- Many apps just use `console.log`
- More complex than current one-liner import

**Verdict:** Actually *more* work than current solution.

---

### Option 7: Log File Watching

**Concept:** Watch log files that servers write to.

```bash
# Pointa watches: ./logs/server.log
tail -f ./logs/server.log | pointa-collector
```

**Pros:**
- Works with any language
- No code changes if app already logs to files

**Cons:**
- Many dev servers don't log to files by default
- Would need to configure each framework differently
- Adds latency (file write → detect → read)

**Verdict:** Too inconsistent across projects.

---

## Recommendation

**Option 1 (CLI Wrapper + NODE_OPTIONS)** is the clear winner:

### Why This Works

| Requirement | Current SDK | CLI Wrapper + NODE_OPTIONS |
|-------------|-------------|---------------------------|
| Zero code changes | ❌ Requires import | ✅ Just prefix command |
| One-time install | ❌ Per-project | ✅ Global CLI |
| Proper log levels | ✅ Yes | ✅ Yes (intercepts console methods) |
| Stack traces | ✅ Yes | ✅ Yes |
| Works with Node.js | ✅ Yes | ✅ Yes |
| Works with Python/Go | ❌ No | ⚠️ Fallback to stdout capture |

### Suggested Implementation Path

1. Add `pointa dev` subcommand to existing `pointa-mcp-server` CLI
2. Detect if command is likely Node.js (npm, node, npx, yarn, pnpm, bun)
3. **For Node.js:** Set `NODE_OPTIONS="--require /path/to/pointa-preload.js"` before spawning
4. **For non-Node:** Use [node-pty](https://github.com/microsoft/node-pty) to capture raw stdout with regex level detection
5. Forward structured logs to existing WebSocket endpoint (`/backend-logs`)
6. Keep existing SDK available but de-emphasize in docs

### Example User Flow

**Before (current - requires SDK):**
```bash
npm install pointa-server-logger
# Edit server.js to add: import 'pointa-server-logger'
npm run dev
```

**After (CLI wrapper - zero code changes, same quality logs):**
```bash
npm install -g pointa-mcp-server  # Already installed for AI integration
pointa dev npm run dev            # Just prefix your command
```

### Comparison: What Users Get

**Current SDK log entry:**
```json
{ "level": "error", "message": "DB connection failed", "stack": "Error: ...", "timestamp": "..." }
```

**New CLI wrapper log entry (Node.js):**
```json
{ "level": "error", "message": "DB connection failed", "stack": "Error: ...", "timestamp": "..." }
```

**Same quality!** The `NODE_OPTIONS` + `--require` approach gives us identical output to the SDK because we're intercepting at the same point (console methods).

---

## Files to Review for Implementation

- `/annotations-server/lib/server.js` - WebSocket handler for `/backend-logs`
- `/server-logger/src/logger.js` - Current SDK implementation for reference
- `/pointa-mcp-server/` - Existing CLI to extend

---

## Decisions

1. **Auto-detect frameworks?** → Yes, detect common frameworks and suggest the wrapper
2. **Separate package?** → No, include in existing `pointa-mcp-server` package
3. **SDK approach?** → Deprecate entirely, only support CLI wrapper going forward

---

## Full Implementation Specification

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `annotations-server/bin/cli.js` | Modify | Add `pointa dev` command |
| `annotations-server/lib/dev-runner.js` | Create | Command spawner with NODE_OPTIONS injection |
| `annotations-server/lib/preload.js` | Create | Console interception script (injected via --require) |
| `server-logger/` | Deprecate | Mark package as deprecated, point users to CLI |
| `server-logger/README.md` | Modify | Add deprecation notice |
| `README.md` | Modify | Update setup instructions to use CLI wrapper |

---

## Part 1: Backend Code Edits

### 1.1 Add `pointa dev` Command (`annotations-server/bin/cli.js`)

Add after existing commands (around line 300):

```javascript
program
  .command('dev')
  .description('Run a command with Pointa server log capture enabled')
  .argument('<command...>', 'Command to run (e.g., npm run dev)')
  .option('-p, --port <number>', 'Pointa server port', '4242')
  .action(async (commandArgs, options) => {
    const { runDevCommand } = await import('../lib/dev-runner.js');
    await runDevCommand(commandArgs, options);
  });
```

### 1.2 Create Dev Runner (`annotations-server/lib/dev-runner.js`)

```javascript
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Commands that indicate Node.js runtime
const NODE_COMMANDS = ['node', 'npm', 'npx', 'yarn', 'pnpm', 'bun', 'tsx', 'ts-node'];

// Framework detection patterns for helpful messaging
const FRAMEWORK_PATTERNS = {
  'next': 'Next.js',
  'nuxt': 'Nuxt',
  'vite': 'Vite',
  'remix': 'Remix',
  'astro': 'Astro',
  'nest': 'NestJS',
  'express': 'Express',
  'fastify': 'Fastify',
  'gatsby': 'Gatsby',
  'svelte': 'SvelteKit',
};

function isNodeCommand(command) {
  const baseCommand = command.split('/').pop();
  return NODE_COMMANDS.some(nc => baseCommand === nc || baseCommand.startsWith(nc + '.'));
}

function detectFramework(commandArgs) {
  const cmdString = commandArgs.join(' ').toLowerCase();
  for (const [pattern, name] of Object.entries(FRAMEWORK_PATTERNS)) {
    if (cmdString.includes(pattern)) return name;
  }
  return null;
}

export async function runDevCommand(commandArgs, options) {
  const [command, ...args] = commandArgs;
  const preloadPath = join(__dirname, 'preload.js');
  const isNode = isNodeCommand(command);
  const framework = detectFramework(commandArgs);

  console.log(chalk.cyan('🔍 Pointa Dev Mode'));
  console.log(chalk.gray(`   Command: ${commandArgs.join(' ')}`));
  if (framework) {
    console.log(chalk.gray(`   Framework: ${framework}`));
  }
  console.log(chalk.gray(`   Mode: ${isNode ? 'Node.js (full instrumentation)' : 'Generic (stdout capture)'}`));
  console.log(chalk.gray(`   Server: ws://127.0.0.1:${options.port}/backend-logs`));
  console.log('');

  // Build environment
  const env = { ...process.env, POINTA_PORT: options.port };

  if (isNode) {
    // Inject preload via NODE_OPTIONS
    const existingNodeOptions = process.env.NODE_OPTIONS || '';
    env.NODE_OPTIONS = `--require "${preloadPath}" ${existingNodeOptions}`.trim();
  }

  // Spawn the command
  const child = spawn(command, args, {
    stdio: 'inherit',  // Pass through stdin/stdout/stderr
    env,
    shell: true,       // Allow shell features like && and ||
  });

  // Handle signals
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
```

### 1.3 Create Preload Script (`annotations-server/lib/preload.js`)

This script is injected into every Node.js process via `--require`:

```javascript
// preload.js - Injected via NODE_OPTIONS="--require /path/to/preload.js"
const WebSocket = require('ws');

const POINTA_PORT = process.env.POINTA_PORT || '4242';
const WS_URL = `ws://127.0.0.1:${POINTA_PORT}/backend-logs`;

let ws = null;
let isRecording = false;
let messageQueue = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

// Format arguments for transmission
function formatArgs(args) {
  return args.map(arg => {
    if (arg === undefined) return 'undefined';
    if (arg === null) return 'null';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, getCircularReplacer(), 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

// Handle circular references in JSON
function getCircularReplacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}

// Send log to Pointa server
function sendLog(level, args, stack = null) {
  if (!isRecording) return;

  const message = {
    type: 'log',
    level,
    message: formatArgs(args),
    timestamp: new Date().toISOString(),
    ...(stack && { stack }),
  };

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    messageQueue.push(message);
  }
}

// Connect to Pointa server
function connect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  try {
    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      reconnectAttempts = 0;

      // Register with server port
      ws.send(JSON.stringify({
        type: 'register',
        serverPort: process.env.PORT || 'unknown'
      }));

      // Flush queued messages
      while (messageQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(messageQueue.shift()));
      }
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'start_recording') {
          isRecording = true;
        } else if (msg.type === 'stop_recording') {
          isRecording = false;
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (e) {}
    });

    ws.on('close', () => {
      ws = null;
      reconnectAttempts++;
      setTimeout(connect, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
    });

    ws.on('error', () => {
      // Silently ignore - don't spam user's console
    });
  } catch (e) {
    // Silently ignore connection errors
  }
}

// Override console methods
console.log = (...args) => {
  sendLog('log', args);
  originalConsole.log(...args);
};

console.warn = (...args) => {
  sendLog('warn', args);
  originalConsole.warn(...args);
};

console.error = (...args) => {
  const stack = new Error().stack;
  sendLog('error', args, stack);
  originalConsole.error(...args);
};

console.info = (...args) => {
  sendLog('info', args);
  originalConsole.info(...args);
};

console.debug = (...args) => {
  sendLog('debug', args);
  originalConsole.debug(...args);
};

// Capture uncaught exceptions
process.on('uncaughtException', (error) => {
  sendLog('error', [error.message], error.stack);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : null;
  sendLog('error', [`Unhandled Promise Rejection: ${message}`], stack);
});

// Start connection
connect();
```

### 1.4 Update Package.json (`annotations-server/package.json`)

Add dependency:
```json
{
  "dependencies": {
    "ws": "^8.14.0"  // Already present for server
  }
}
```

Note: `ws` is already a dependency, so no changes needed for the preload script.

---

## Part 2: End-User Experience

### 2.1 Installation (One-Time)

```bash
# Users who use Pointa with AI tools already have this installed
npm install -g pointa-mcp-server

# Or if they only want the CLI:
npm install -g pointa-cli
```

### 2.2 Daily Usage

**Instead of:**
```bash
npm run dev
```

**User runs:**
```bash
pointa dev npm run dev
```

### 2.3 What the User Sees

```
$ pointa dev npm run dev

🔍 Pointa Dev Mode
   Command: npm run dev
   Mode: Node.js (full instrumentation)
   Server: ws://127.0.0.1:4242/backend-logs

> my-app@1.0.0 dev
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Ready in 1.2s

[Regular server output continues normally...]
```

### 2.4 Recording Flow (Same as Current)

1. User opens their app in Chrome with Pointa extension
2. User triggers bug recording in extension
3. Extension calls `POST /api/backend-logs/start`
4. Server broadcasts `{ type: 'start_recording' }` to all connected preload instances
5. Preload scripts start sending console logs to server
6. User reproduces the bug
7. User stops recording
8. Extension calls `POST /api/backend-logs/stop`
9. Server returns all captured logs
10. Bug report includes full server logs with proper levels and timestamps

### 2.5 Log Output in Bug Reports

**Logs appear in the bug report timeline with:**
- ✅ Proper log level (log/warn/error/info/debug)
- ✅ Timestamp (ISO-8601)
- ✅ Stack traces for errors
- ✅ `source: 'backend'` identifier
- ✅ `relativeTime` in milliseconds since recording started

**Example log entry in bug report:**
```json
{
  "type": "backend-error",
  "level": "error",
  "message": "Database connection failed: ECONNREFUSED",
  "stack": "Error: Database connection failed\n    at connect (/app/db.js:42:15)\n    at Server.start (/app/server.js:15:3)",
  "timestamp": "2026-01-12T10:30:45.123Z",
  "source": "backend",
  "relativeTime": 1523
}
```

### 2.6 Comparison: Before vs After

| Aspect | Before (SDK) | After (CLI Wrapper) |
|--------|--------------|---------------------|
| **Setup** | `npm install pointa-server-logger` + edit code | Just prefix command |
| **Code changes** | Add `import 'pointa-server-logger'` | None |
| **Per-project?** | Yes | No (global install) |
| **Log quality** | Full structured | Full structured (same!) |
| **Stack traces** | Yes | Yes |
| **Non-Node support** | No | Partial (stdout capture) |

---

## Part 3: SDK Deprecation

### 3.1 Deprecate NPM Package (`server-logger/package.json`)

Add deprecation notice:
```json
{
  "name": "pointa-server-logger",
  "version": "0.3.0",
  "deprecated": "This package is deprecated. Use 'pointa dev' CLI wrapper instead. See https://github.com/AmElmo/pointa#server-logs"
}
```

### 3.2 Update SDK README (`server-logger/README.md`)

Replace content with:
```markdown
# ⚠️ DEPRECATED

This package is deprecated. Use the `pointa dev` CLI wrapper instead.

## Migration

**Before (this package):**
```bash
npm install pointa-server-logger
# Edit code to add: import 'pointa-server-logger'
npm run dev
```

**After (CLI wrapper - recommended):**
```bash
pointa dev npm run dev
```

No code changes needed. Same log quality. See [Pointa documentation](https://github.com/AmElmo/pointa#server-logs) for details.
```

### 3.3 Publish Deprecation

```bash
cd server-logger
npm version 0.3.0
npm publish --access public
npm deprecate pointa-server-logger "Use 'pointa dev' CLI wrapper instead"
```

---

## Verification Plan

### Test 1: Basic Node.js App
```bash
# Create test app
mkdir test-app && cd test-app
echo 'console.log("hello"); console.error("oops");' > app.js

# Run with pointa dev
pointa dev node app.js

# Verify in extension that logs are captured when recording
```

### Test 2: Next.js App
```bash
# Run existing Next.js project
cd my-nextjs-app
pointa dev npm run dev

# Trigger recording in extension, check logs appear
```

### Test 3: Child Process Inheritance
```bash
# Create app that spawns child processes
pointa dev npm run dev  # (where dev script uses nodemon or similar)

# Verify logs from both parent and child processes are captured
```

### Test 4: Reconnection
```bash
# Start app before Pointa server
pointa dev npm run dev  # (server not running)

# Start Pointa server
pointa-server start

# Verify connection is established and logs flow
```

---

## Sources

**Key discovery (NODE_OPTIONS + --require):**
- [Node.js CLI docs - --require flag](https://nodejs.org/api/cli.html) - "preloads the specified module at startup"
- [NODE_OPTIONS announcement](https://medium.com/the-node-js-collection/node-options-has-landed-in-8-x-5fba57af703d) - "environment variables are inherited by child processes"
- [Preloading Node module](https://glebbahmutov.com/blog/preloading-node-module/) - Practical examples of runtime extension

**Other approaches researched:**
- [node-pty (Microsoft)](https://github.com/microsoft/node-pty) - PTY for Node.js
- [capture-console](https://www.npmjs.com/package/capture-console) - stdout capture
- [script command](https://www.man7.org/linux/man-pages/man1/script.1.html) - Unix terminal recording
- [OpenTelemetry zero-code JS](https://opentelemetry.io/docs/zero-code/js/) - Auto-instrumentation
- [V8 Inspector / CDP](https://chromedevtools.github.io/devtools-protocol/v8/) - Runtime.consoleAPICalled
- [VS Code Terminal API request](https://github.com/microsoft/vscode/issues/190941) - API limitations
- [Warp Blocks](https://docs.warp.dev/terminal/blocks) - Terminal block concept
- [mcp-command-proxy](https://github.com/Hormold/mcp-command-proxy) - Similar CLI wrapper pattern
- [DYLD_INSERT_LIBRARIES](https://theevilbit.github.io/posts/dyld_insert_libraries_dylib_injection_in_macos_osx_deep_dive/) - macOS library injection (not viable due to SIP)
