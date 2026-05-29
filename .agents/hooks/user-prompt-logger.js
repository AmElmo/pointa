#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { envFlag, redactString, sha256Hex } = require('../common/log-safety');

const prompt = process.argv.slice(2).join(' ');
if (!prompt) process.exit(0);

const root = process.cwd();
const dir = path.join(root, '.agents', 'logs');
const file = path.join(dir, 'prompts.jsonl');
fs.mkdirSync(dir, { recursive: true });

const redacted = redactString(prompt);
const row = {
  timestamp: new Date().toISOString(),
  prompt_hash: sha256Hex(prompt),
  prompt_length: prompt.length,
  redaction: {
    applied: redacted.replacements > 0,
    replacements: redacted.replacements
  }
};

if (envFlag('DELANO_LOG_REDACTED_PROMPTS')) {
  row.prompt_redacted = redacted.value;
}

if (envFlag('DELANO_LOG_RAW_PROMPTS')) {
  row.prompt_raw = envFlag('DELANO_LOG_UNREDACTED_PROMPTS') ? prompt : redacted.value;
  row.raw_prompt_redacted = !envFlag('DELANO_LOG_UNREDACTED_PROMPTS');
}

fs.appendFileSync(file, JSON.stringify(row) + '\n', 'utf8');
