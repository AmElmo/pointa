# pointa-server-logger

Capture backend server logs for Pointa bug reports. When you record a bug with the Pointa Chrome extension, this package streams your server's console output to include in the bug report timeline.

## Installation

```bash
npm install pointa-server-logger
```

## Quick Start

Add one line to your server's entry point:

```javascript
// At the top of your server file (e.g., server.js, index.js, app.js)
import 'pointa-server-logger';

// Your existing code...
import express from 'express';
const app = express();
// ...
```

That's it! When you record a bug with the Pointa Chrome extension, your server's console logs will automatically be included in the bug report.

## How It Works

1. The package connects to the Pointa server running on your machine (localhost:4242)
2. When you start recording a bug in the Chrome extension, the server signals this package to start capturing
3. All `console.log`, `console.warn`, `console.error` calls are captured and streamed
4. When you stop recording, the logs are included in your bug report timeline

## Usage with Options

If you need to customize the connection:

```javascript
import { initPointaLogger } from 'pointa-server-logger';

initPointaLogger({
  port: 4242,           // Pointa server port (default: 4242)
  host: '127.0.0.1',    // Pointa server host (default: '127.0.0.1')
  captureErrors: true,  // Capture uncaught exceptions (default: true)
  captureRejections: true // Capture unhandled promise rejections (default: true)
});
```

## Framework Examples

### Express

```javascript
import 'pointa-server-logger';
import express from 'express';

const app = express();

app.get('/api/users', (req, res) => {
  console.log('Fetching users'); // This will be captured
  res.json({ users: [] });
});

app.listen(3000);
```

### Next.js

Edit `next.config.js` in your project root and add:

```typescript
import 'pointa-server-logger';
```

### Fastify

```javascript
import 'pointa-server-logger';
import Fastify from 'fastify';

const fastify = Fastify();

fastify.get('/api/data', async (request, reply) => {
  console.log('Processing request'); // This will be captured
  return { data: 'hello' };
});

fastify.listen({ port: 3000 });
```

### Hono

```javascript
import 'pointa-server-logger';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/api/hello', (c) => {
  console.log('Hello endpoint called'); // This will be captured
  return c.json({ message: 'Hello!' });
});

serve(app);
```

## What Gets Captured

- ✅ `console.log()` - standard logs
- ✅ `console.warn()` - warnings
- ✅ `console.error()` - errors
- ✅ `console.info()` - info logs
- ✅ `console.debug()` - debug logs
- ✅ Uncaught exceptions (with stack traces)
- ✅ Unhandled promise rejections

## Requirements

- Node.js 16+
- Pointa Chrome extension installed
- Pointa server running (`npx pointa-server` or via your AI tool's MCP config)

## Privacy

- All logs stay local on your machine
- Nothing is sent to external servers
- The package only communicates with the local Pointa server (localhost)
- Logs are only captured during active bug recording sessions

## License

MIT

