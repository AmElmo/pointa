import { spawn } from 'child_process';
import WebSocket from 'ws';
import fetch from 'node-fetch';

const port = 5556;
const server = spawn('node', ['lib/server.js'], {
  cwd: new URL('.', import.meta.url).pathname, // run from annotations-server
  env: { ...process.env, POINTA_PORT: String(port), POINTA_STDIO_MODE: 'false' },
  stdio: ['ignore', 'pipe', 'pipe']
});

server.stdout.on('data', (d) => process.stdout.write('[server] ' + d.toString()));
server.stderr.on('data', (d) => process.stderr.write('[server-err] ' + d.toString()));

function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

(async () => {
  await delay(1000);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/backend-logs`);
  ws.on('open', async () => {
    console.log('client: ws open');
    ws.send(JSON.stringify({ type: 'register', serverPort: 3000 }));
    const res = await fetch(`http://127.0.0.1:${port}/api/backend-logs/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captureStdout: true })
    });
    console.log('start status', res.status);
    console.log('start body', await res.text());
  });
  ws.on('message', (data) => {
    console.log('client received', data.toString());
  });
  await delay(2500);
  ws.close();
  server.kill('SIGINT');
})();
