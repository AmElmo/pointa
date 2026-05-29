#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [action = 'start', sessionId = 'unknown'] = process.argv.slice(2);
const root = process.cwd();
const dir = path.join(root, '.agents', 'logs');
const file = path.join(dir, 'sessions.jsonl');
fs.mkdirSync(dir, { recursive: true });

const row = {
  timestamp: new Date().toISOString(),
  action,
  sessionId
};

fs.appendFileSync(file, JSON.stringify(row) + '\n', 'utf8');
