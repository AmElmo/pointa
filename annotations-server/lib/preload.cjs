// preload.cjs - Injected via NODE_OPTIONS="--require /path/to/preload.cjs"
// This file uses CommonJS to ensure compatibility when injected into any Node.js project

const POINTA_PORT = process.env.POINTA_PORT || '4242';
const WS_URL = `ws://127.0.0.1:${POINTA_PORT}/backend-logs`;

let ws = null;
let isRecording = false;
let captureStdout = false;  // Whether to capture stdout/stderr (full terminal output)
let stdoutHooked = false;   // Track if stdout hooks are active
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

// Store original stdout/stderr write methods
const originalStdout = process.stdout.write.bind(process.stdout);
const originalStderr = process.stderr.write.bind(process.stderr);

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

  if (ws && ws.readyState === 1) { // WebSocket.OPEN = 1
    ws.send(JSON.stringify(message));
  } else {
    messageQueue.push(message);
  }
}

// Send raw stdout/stderr output to Pointa server
function sendStdoutLog(stream, data) {
  if (!isRecording || !captureStdout) return;

  // Convert buffer to string and clean ANSI codes for readability
  let text = typeof data === 'string' ? data : data.toString('utf8');

  // Strip ANSI escape codes (colors, cursor movement, etc.)
  text = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

  // Skip empty lines
  if (!text.trim()) return;

  const message = {
    type: 'log',
    level: stream === 'stderr' ? 'stderr' : 'stdout',
    message: text.trimEnd(),
    timestamp: new Date().toISOString(),
    source: 'terminal',
  };

  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  } else {
    messageQueue.push(message);
  }
}

// Hook stdout/stderr to capture all terminal output
function hookStdout() {
  if (stdoutHooked) return;

  process.stdout.write = (chunk, encoding, callback) => {
    sendStdoutLog('stdout', chunk);
    return originalStdout(chunk, encoding, callback);
  };

  process.stderr.write = (chunk, encoding, callback) => {
    sendStdoutLog('stderr', chunk);
    return originalStderr(chunk, encoding, callback);
  };

  stdoutHooked = true;
}

// Restore original stdout/stderr
function unhookStdout() {
  if (!stdoutHooked) return;

  process.stdout.write = originalStdout;
  process.stderr.write = originalStderr;

  stdoutHooked = false;
}

// Connect to Pointa server
function connect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  // Dynamic require to avoid issues if ws is not installed in the target project
  let WebSocket;
  try {
    WebSocket = require('ws');
  } catch (e) {
    // ws not available - silently disable logging
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      reconnectAttempts = 0;

      // Register with server port - POINTA_APP_PORT is set by `pointa dev` command
      // Falls back to PORT env var or 'unknown' if neither is set
      const serverPort = process.env.POINTA_APP_PORT || process.env.PORT || 'unknown';
      originalConsole.log(`[Pointa] Connected to server, registering as port ${serverPort}`);
      ws.send(JSON.stringify({
        type: 'register',
        serverPort
      }));

      // Flush queued messages
      while (messageQueue.length > 0 && ws.readyState === 1) {
        ws.send(JSON.stringify(messageQueue.shift()));
      }
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        originalConsole.log('[Pointa] Received message:', msg.type, msg.captureStdout !== undefined ? `captureStdout=${msg.captureStdout}` : '');
        if (msg.type === 'start_recording') {
          isRecording = true;
          captureStdout = msg.captureStdout === true;

          if (captureStdout) {
            hookStdout();
            originalConsole.log('[Pointa] Backend log recording STARTED (console + terminal output)');
          } else {
            originalConsole.log('[Pointa] Backend log recording STARTED (console only)');
          }
        } else if (msg.type === 'stop_recording') {
          isRecording = false;
          captureStdout = false;
          unhookStdout();
          originalConsole.log('[Pointa] Backend log recording STOPPED');
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
  // Re-throw to maintain default behavior
  throw error;
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : null;
  sendLog('error', [`Unhandled Promise Rejection: ${message}`], stack);
});

// Start connection
connect();
