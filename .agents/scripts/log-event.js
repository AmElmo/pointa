#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { redactObject } = require('../common/log-safety');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: log-event.js <type> <actor> [--key value ...]');
  process.exit(1);
}

const [type, actor, ...rest] = args;
const event = {
  timestamp: new Date().toISOString(),
  type,
  actor,
  meta: {}
};

for (let i = 0; i < rest.length; i++) {
  const token = rest[i];
  if (!token.startsWith('--')) continue;
  const key = token.slice(2);
  const value = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true';
  event.meta[key] = value;
}

event.meta = redactObject(event.meta);

const root = process.cwd();
const logDir = path.join(root, '.agents', 'logs');
const logFile = path.join(logDir, 'changes.jsonl');
fs.mkdirSync(logDir, { recursive: true });
fs.appendFileSync(logFile, JSON.stringify(event) + '\n', 'utf8');

console.log(`logged ${type}`);
