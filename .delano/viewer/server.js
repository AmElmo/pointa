#!/usr/bin/env node
/*
 * Delano read-only markdown viewer.
 * Serves .project markdown contracts without writing repo state.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { spawn, spawnSync } = require('node:child_process');

const repoRoot = path.resolve(process.env.DELANO_VIEWER_ROOT || path.resolve(__dirname, '..', '..'));
const projectRoot = path.join(repoRoot, '.project');
const publicRoot = path.join(__dirname, 'public');
const DEFAULT_PORT = 3977;
const MAX_PORT = 65535;
const MAX_PORT_ATTEMPTS = 100;
const startPort = normalizePort(process.env.DELANO_VIEWER_PORT || process.env.PORT, DEFAULT_PORT);

function normalizePort(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PORT) return fallback;
  return parsed;
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function splitFrontmatter(markdown) {
  if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) return { frontmatter: {}, body: markdown };
  const normalized = markdown.replace(/^---\r?\n/, '');
  const close = normalized.search(/\r?\n---\r?\n/);
  if (close < 0) return { frontmatter: {}, body: markdown };
  const yaml = normalized.slice(0, close);
  const body = normalized.slice(close).replace(/^\r?\n---\r?\n/, '');
  return { frontmatter: parseSimpleYaml(yaml), body };
}

function parseScalar(raw) {
  const value = raw.trim().replace(/^['"]|['"]$/g, '');
  if (value === '') return '';
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map((item) => parseScalar(item)).filter((item) => item !== '');
  }
  return value;
}

function parseSimpleYaml(yaml) {
  const data = {};
  let currentKey = null;
  for (const line of yaml.split(/\r?\n/)) {
    const list = line.match(/^\s*-\s+(.*)$/);
    if (list && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = data[currentKey] ? [data[currentKey]] : [];
      data[currentKey].push(parseScalar(list[1]));
      continue;
    }
    const pair = line.match(/^([^:#][^:]*):\s*(.*)$/);
    if (!pair) continue;
    currentKey = pair[1].trim();
    data[currentKey] = pair[2] ? parseScalar(pair[2]) : [];
  }
  return data;
}

function firstHeading(body) {
  const heading = body.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : null;
}

function snippet(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`>#\-[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function relationshipFields(frontmatter) {
  const result = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    const links = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
    if (links.length) result[key] = links;
  }
  return result;
}

function projectSlugFor(rel) {
  const match = rel.match(/^projects\/([^/]+)\//);
  return match ? match[1] : null;
}

function artifactRoleFor(rel) {
  if (rel.startsWith('context/')) return rel.endsWith('/progress.md') || rel.endsWith('progress.md') ? 'progress' : 'context';
  if (rel.startsWith('templates/')) return 'template';
  if (/\/spec\.md$/.test(rel)) return 'spec';
  if (/\/plan\.md$/.test(rel)) return 'plan';
  if (/\/decisions\.md$/.test(rel)) return 'decision';
  if (/\/progress\.md$/.test(rel) || /\/updates\//.test(rel) || /\/completion-summary\.md$/.test(rel)) return 'progress';
  if (/\/workstreams\/[^/]+\.md$/.test(rel)) return 'workstream';
  if (/\/tasks\/[^/]+\.md$/.test(rel)) return 'task';
  return 'context';
}

function codeFromFilename(rel, prefix) {
  const base = path.basename(rel, '.md');
  const match = base.match(new RegExp(`^(${prefix}-[A-Za-z0-9]+)`));
  return match ? match[1] : null;
}

function normalizeWorkstreamId(value) {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  return /^WS-[A-Z0-9]+$/.test(normalized) ? normalized : null;
}

function csvArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  return [String(value)];
}

function docMeta(file) {
  const markdown = readText(file);
  const { frontmatter, body } = splitFrontmatter(markdown);
  const rel = path.relative(projectRoot, file).replace(/\\/g, '/');
  const stat = fs.statSync(file);
  const role = artifactRoleFor(rel);
  return {
    path: rel,
    title: frontmatter.name || firstHeading(body) || path.basename(file, '.md'),
    status: frontmatter.status || null,
    type: rel.startsWith('context/') ? 'context' : rel.split('/')[0],
    project: projectSlugFor(rel),
    role,
    artifactRole: role,
    workstreamId: role === 'workstream' ? codeFromFilename(rel, 'WS') : (role === 'task' ? normalizeWorkstreamId(frontmatter.workstream) : null),
    taskId: role === 'task' ? frontmatter.id || codeFromFilename(rel, 'T') : null,
    dependsOn: role === 'task' ? csvArray(frontmatter.depends_on) : [],
    updated: frontmatter.updated || frontmatter.timestamp || stat.mtime.toISOString(),
    frontmatter,
    relationships: relationshipFields(frontmatter),
    snippet: snippet(body),
    size: stat.size,
  };
}

function words(text) {
  return new Set(String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['and', 'the', 'for', 'with', 'docs'].includes(w)));
}

function overlapScore(a, b) {
  let score = 0;
  for (const word of a) if (b.has(word)) score += 1;
  return score;
}

function relateTasksToWorkstreams(projectDocs) {
  const workstreams = projectDocs.filter((doc) => doc.role === 'workstream');
  const tasks = projectDocs.filter((doc) => doc.role === 'task');
  const wsById = new Map(workstreams.map((ws) => [ws.workstreamId, ws]));
  const wsWords = new Map(workstreams.map((ws) => [ws.path, words(`${ws.workstreamId} ${ws.title} ${ws.snippet}`)]));
  for (const task of tasks) {
    if (task.workstreamId && wsById.has(task.workstreamId)) {
      task.workstreamPath = wsById.get(task.workstreamId).path;
      continue;
    }
    const taskWords = words(`${task.taskId} ${task.title} ${task.snippet}`);
    let best = null;
    for (const ws of workstreams) {
      const score = overlapScore(taskWords, wsWords.get(ws.path));
      if (!best || score > best.score) best = { ws, score };
    }
    task.workstreamId = best && best.score > 0 ? best.ws.workstreamId : null;
    task.workstreamPath = best && best.score > 0 ? best.ws.path : null;
  }
}

function projectOutline(projectDocs) {
  relateTasksToWorkstreams(projectDocs);
  const byRole = (role) => projectDocs.filter((doc) => doc.role === role);
  const byName = (docs) => docs.slice().sort((a, b) => a.path.localeCompare(b.path));
  const tasks = byName(byRole('task'));
  return {
    spec: byRole('spec')[0]?.path || null,
    plan: byRole('plan')[0]?.path || null,
    progress: byRole('progress').map((doc) => doc.path),
    decisions: byRole('decision').map((doc) => doc.path),
    workstreams: byName(byRole('workstream')).map((ws) => ({
      path: ws.path,
      id: ws.workstreamId,
      title: ws.title,
      status: ws.status,
      tasks: tasks.filter((task) => task.workstreamPath === ws.path).map((task) => task.path),
    })),
    unassignedTasks: tasks.filter((task) => !task.workstreamPath).map((task) => task.path),
  };
}

function loadIndex() {
  const docs = walkMarkdown(projectRoot).map(docMeta);
  const projectSlugs = fs.existsSync(path.join(projectRoot, 'projects'))
    ? fs.readdirSync(path.join(projectRoot, 'projects'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  const fixed = [
    {
      slug: 'context',
      title: 'Project',
      status: null,
      created: null,
      pinned: true,
      docs: docs.filter((doc) => doc.path.startsWith('context/')).map((doc) => doc.path),
    },
    {
      slug: 'templates',
      title: 'Templates',
      status: null,
      created: null,
      pinned: true,
      docs: docs.filter((doc) => doc.path.startsWith('templates/')).map((doc) => doc.path),
    },
  ];
  const projectEntries = projectSlugs.map((slug) => {
    const projectDocs = docs.filter((doc) => doc.path.startsWith(`projects/${slug}/`));
    const spec = projectDocs.find((doc) => doc.path.endsWith('/spec.md'));
    const plan = projectDocs.find((doc) => doc.path.endsWith('/plan.md'));
    const outline = projectOutline(projectDocs);
    return {
      slug,
      title: spec?.frontmatter.name || plan?.frontmatter.name || slug.replace(/-/g, ' '),
      status: spec?.frontmatter.status || plan?.frontmatter.status || null,
      created: spec?.frontmatter.created || plan?.frontmatter.created || null,
      pinned: false,
      docs: projectDocs.map((doc) => doc.path),
      outline,
    };
  });
  // Sort non-pinned project entries by `created` desc; entries without `created` keep their relative order at the end.
  projectEntries.sort((a, b) => {
    if (!a.created && !b.created) return 0;
    if (!a.created) return 1;
    if (!b.created) return -1;
    return String(b.created).localeCompare(String(a.created));
  });
  const projects = [...fixed, ...projectEntries];
  return { repo: path.basename(repoRoot), generatedAt: new Date().toISOString(), projects, docs };
}

function sendJson(res, data) {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data, null, 2));
}

function projectFileFromRequest(rel) {
  const file = path.resolve(projectRoot, String(rel || ''));
  if (!String(rel || '').endsWith('.md') || !isInside(projectRoot, file) || !fs.existsSync(file)) return null;
  return file;
}

function windowsPath(file) {
  const converted = spawnSync('wslpath', ['-w', file], { encoding: 'utf8' });
  return converted.status === 0 ? converted.stdout.trim() : file;
}

function commandExists(command) {
  const check = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], { stdio: 'ignore' });
  return check.status === 0;
}

function openTarget(target, file) {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (target === 'code') {
    if (!commandExists('code')) return { ok: false, error: 'VS Code CLI `code` was not found on PATH.' };
    // On Windows the CLI is `code.cmd`; spawn requires shell:true to resolve PATHEXT.
    spawn('code', ['-g', file], { detached: true, stdio: 'ignore', shell: isWin }).unref();
    return { ok: true, target, opened: file };
  }

  if (target === 'explorer') {
    const dir = path.dirname(file);

    // Native Windows: launch explorer.exe directly with the directory.
    if (isWin) {
      spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true, target, opened: dir };
    }

    // WSL: explorer.exe is reachable through the mounted Windows path.
    const wslExplorer = '/mnt/c/Windows/explorer.exe';
    if (fs.existsSync(wslExplorer)) {
      spawn(wslExplorer, [windowsPath(dir)], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true, target, opened: dir };
    }

    // macOS / Linux fall back to `open` / `xdg-open`.
    const opener = isMac ? 'open' : 'xdg-open';
    if (!commandExists(opener)) return { ok: false, error: `System opener \`${opener}\` was not found.` };
    spawn(opener, [dir], { detached: true, stdio: 'ignore' }).unref();
    return { ok: true, target, opened: dir };
  }

  return { ok: false, error: 'Unknown open target.' };
}

function sendStatic(res, pathname) {
  if (pathname === '/favicon.ico') {
    const faviconPath = path.join(publicRoot, 'favicon.png');
    if (fs.existsSync(faviconPath)) {
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'max-age=86400' });
      res.end(fs.readFileSync(faviconPath));
      return;
    }
    res.writeHead(204, { 'cache-control': 'max-age=86400' });
    res.end();
    return;
  }
  const file = pathname === '/' ? path.join(publicRoot, 'index.html') : path.join(publicRoot, pathname);
  const resolved = path.resolve(file);
  if (!isInside(publicRoot, resolved) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(resolved).toLowerCase();
  const mimeMap = {
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
  };
  const isText = ext === '.js' || ext === '.jsx' || ext === '.css' || ext === '.svg' || ext === '' || ext === '.html';
  const type = mimeMap[ext] || 'text/html';
  const headers = isText ? { 'content-type': `${type}; charset=utf-8` } : { 'content-type': type };
  res.writeHead(200, headers);
  res.end(fs.readFileSync(resolved));
}

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    if (parsed.pathname === '/api/index') return sendJson(res, loadIndex());
    if (parsed.pathname === '/api/doc') {
      const rel = String(parsed.query.path || '');
      const file = projectFileFromRequest(rel);
      if (!file) {
        res.writeHead(404); res.end('Document not found'); return;
      }
      const markdown = readText(file);
      const meta = docMeta(file);
      return sendJson(res, { ...meta, markdown, body: splitFrontmatter(markdown).body });
    }
    if (parsed.pathname === '/api/open') {
      if (req.method !== 'POST') {
        res.writeHead(405); res.end('Use POST'); return;
      }
      const rel = String(parsed.query.path || '');
      const file = projectFileFromRequest(rel);
      if (!file) {
        res.writeHead(404); res.end('Document not found'); return;
      }
      const result = openTarget(String(parsed.query.target || ''), file);
      if (!result.ok) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result, null, 2)); return;
      }
      return sendJson(res, result);
    }
    return sendStatic(res, decodeURIComponent(parsed.pathname));
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(error.stack || String(error));
  }
});

function listenWithPortFallback(server, firstPort, host = '127.0.0.1') {
  let port = firstPort;
  let attempts = 0;

  const listen = () => {
    server.once('error', onError);
    server.listen(port, host);
  };

  const onError = (error) => {
    if (error.code === 'EADDRINUSE' && port < MAX_PORT && attempts < MAX_PORT_ATTEMPTS) {
      attempts += 1;
      port += 1;
      listen();
      return;
    }

    console.error(`Failed to start Delano viewer on ${host}:${port}: ${error.message}`);
    process.exitCode = 1;
  };

  const onListening = () => {
    server.removeListener('error', onError);
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    const skipped = actualPort !== firstPort ? ` (${firstPort} was unavailable)` : '';
    console.log(`Delano read-only viewer: http://${host}:${actualPort}${skipped}`);
  };

  server.on('listening', onListening);
  listen();
}

listenWithPortFallback(server, startPort);
