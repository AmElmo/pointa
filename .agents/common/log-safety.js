const crypto = require('crypto');

const SECRET_PATTERNS = [
  /\b(sk-[A-Za-z0-9_-]{12,})\b/g,
  /\b(github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\b(gh[pousr]_[A-Za-z0-9_]{20,})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
  /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
  /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*([^\s"']+)/gi
];

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function envFlag(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function redactString(value) {
  let output = String(value || '');
  let replacements = 0;

  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, (...args) => {
      replacements += 1;
      const match = args[0];
      if (/^(password|passwd|pwd|secret|token|api[_-]?key)/i.test(match)) {
        return match.replace(/[:=]\s*[^\s"']+/i, ': [REDACTED]');
      }
      return '[REDACTED]';
    });
  }

  return { value: output, replacements };
}

function redactObject(value) {
  if (typeof value === 'string') return redactString(value).value;
  if (Array.isArray(value)) return value.map(redactObject);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, redactObject(nested)])
  );
}

module.exports = {
  envFlag,
  redactObject,
  redactString,
  sha256Hex
};
