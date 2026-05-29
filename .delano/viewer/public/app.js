const state = { index: null, project: 'context', doc: null, query: '', status: 'all', role: 'all', workstream: null, outlineOpen: false, sortBy: 'path', sortDir: 'asc' };

const SORT_FIELDS = [
  { value: 'path',    label: 'Path' },
  { value: 'title',   label: 'Title' },
  { value: 'updated', label: 'Updated' },
  { value: 'status',  label: 'Status' },
  { value: 'role',    label: 'Role' },
  { value: 'taskId',  label: 'Task ID' },
];

function sortFieldExists(field) {
  return SORT_FIELDS.some((f) => f.value === field);
}

function getSortValue(doc, field) {
  switch (field) {
    case 'title':   return (doc.title || '').toLowerCase();
    case 'path':    return (doc.path || '').toLowerCase();
    case 'updated': return doc.updated || '';
    case 'status':  return (doc.status || '').toLowerCase();
    case 'role':    return (doc.role || '').toLowerCase();
    case 'taskId':  return doc.taskId || '';
    default:        return '';
  }
}

function compareDocs(a, b, field, dir) {
  const va = getSortValue(a, field);
  const vb = getSortValue(b, field);
  const aEmpty = va === '' || va == null;
  const bEmpty = vb === '' || vb == null;
  // Empties always sort to the end regardless of direction.
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
  return dir === 'desc' ? -cmp : cmp;
}

const $ = (sel) => document.querySelector(sel);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const titleCase = (s) => String(s || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const COPY_ICON_SVG = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="5" y="2" width="9" height="10" rx="1.6"/><path d="M11 12v1.4A1.6 1.6 0 0 1 9.4 15H2.6A1.6 1.6 0 0 1 1 13.4V6.6A1.6 1.6 0 0 1 2.6 5H4"/></svg>';

const copyRegistry = new Map();
let copyCounter = 0;

function resetCopyRegistry() {
  copyRegistry.clear();
  copyCounter = 0;
}

function normalizeCopyValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return String(value);
}

function registerCopy(value) {
  const text = normalizeCopyValue(value);
  if (text === '') return null;
  const id = `c${++copyCounter}`;
  copyRegistry.set(id, text);
  return id;
}

function copyButton(value, label, extraClass = '') {
  const id = registerCopy(value);
  if (!id) return '';
  const safeLabel = escapeHtml(label || 'Copy value');
  const cls = ['copy-btn', extraClass].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" data-copy="${id}" aria-label="${safeLabel}" title="${safeLabel}">${COPY_ICON_SVG}</button>`;
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fall through */ }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

function announceCopy(label) {
  const live = document.getElementById('copy-live');
  if (!live) return;
  live.textContent = '';
  setTimeout(() => { live.textContent = `Copied ${label || 'value'}`; }, 10);
}

function attachCopyDelegation() {
  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-copy]');
    if (!btn) return;
    const id = btn.getAttribute('data-copy');
    const value = copyRegistry.get(id);
    if (value == null) return;
    event.preventDefault();
    event.stopPropagation();
    const ok = await copyText(value);
    if (!ok) return;

    announceCopy(btn.getAttribute('aria-label') || 'value');

    // Prefer swapping a dedicated label span so adjacent icons survive the swap.
    const labelEl = btn.querySelector('.action-label');
    const hasInlineSvg = !!btn.querySelector('svg');
    const wasCopied = btn.classList.contains('copied');

    // Cancel any pending restore from an earlier click on the same button.
    if (btn._copyResetId) {
      clearTimeout(btn._copyResetId);
      btn._copyResetId = null;
    }

    if (!wasCopied) {
      if (labelEl) {
        btn._copyOriginalLabel = labelEl.textContent;
        labelEl.textContent = 'Copied';
      } else if (!hasInlineSvg) {
        btn._copyOriginalText = btn.textContent;
        btn.textContent = 'Copied';
      }
    }
    btn.classList.add('copied');

    btn._copyResetId = setTimeout(() => {
      btn.classList.remove('copied');
      if (labelEl && typeof btn._copyOriginalLabel === 'string') {
        labelEl.textContent = btn._copyOriginalLabel;
        delete btn._copyOriginalLabel;
      }
      if (typeof btn._copyOriginalText === 'string') {
        btn.textContent = btn._copyOriginalText;
        delete btn._copyOriginalText;
      }
      btn._copyResetId = null;
    }, 1400);
  }, true);
}

function setMoreOpen(open) {
  const dropdown = document.querySelector('.tab-dropdown');
  const moreBtn = document.querySelector('[data-tab-more]');
  if (!dropdown || !moreBtn) return;
  dropdown.setAttribute('data-open', open ? 'true' : 'false');
  moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function attachTabDropdownDelegation() {
  document.addEventListener('click', (event) => {
    const moreBtn = event.target.closest('[data-tab-more]');
    if (moreBtn) {
      event.preventDefault();
      event.stopPropagation();
      const dropdown = document.querySelector('.tab-dropdown');
      const isOpen = dropdown && dropdown.getAttribute('data-open') === 'true';
      setMoreOpen(!isOpen);
      return;
    }
    const dropdown = document.querySelector('.tab-dropdown');
    if (!dropdown || dropdown.getAttribute('data-open') !== 'true') return;
    if (!event.target.closest('.tab-dropdown')) {
      setMoreOpen(false);
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const dropdown = document.querySelector('.tab-dropdown');
    if (dropdown && dropdown.getAttribute('data-open') === 'true') {
      setMoreOpen(false);
      const moreBtn = document.querySelector('[data-tab-more]');
      if (moreBtn) moreBtn.focus();
    }
  });
}

function applyTabOverflow() {
  const tabsContainer = document.querySelector('.tabs');
  if (!tabsContainer) return;
  const moreBtn = tabsContainer.querySelector('.tab-more');
  if (!moreBtn) return;
  const allTabs = [...tabsContainer.querySelectorAll('.tab')];

  // Reset state to measure honestly.
  allTabs.forEach((t) => t.classList.remove('overflow-hidden'));
  moreBtn.classList.remove('hidden');
  moreBtn.classList.remove('has-active');

  // Bail out when the tab row is configured to wrap (mobile breakpoint).
  const flexWrap = window.getComputedStyle(tabsContainer).flexWrap;
  if (flexWrap === 'wrap' || flexWrap === 'wrap-reverse') {
    moreBtn.classList.add('hidden');
    return;
  }

  const containerWidth = tabsContainer.clientWidth;
  const gap = 6;
  const moreWidth = moreBtn.getBoundingClientRect().width;
  const widths = allTabs.map((t) => t.getBoundingClientRect().width);

  // Total width of all tabs (without the More button).
  let total = 0;
  for (let i = 0; i < allTabs.length; i++) {
    total += widths[i] + (i > 0 ? gap : 0);
  }
  if (total <= containerWidth) {
    moreBtn.classList.add('hidden');
    return;
  }

  // Pinned tabs are always visible; subtract their width from the container budget upfront.
  const pinnedWidth = allTabs.reduce((acc, t, i) => (
    t.classList.contains('tab-fixed') ? acc + widths[i] + (acc > 0 ? gap : 0) : acc
  ), 0);
  const budget = containerWidth - moreWidth - gap - pinnedWidth - (pinnedWidth > 0 ? gap : 0);

  let used = 0;
  let activeHidden = false;
  let truncated = false;

  for (let i = 0; i < allTabs.length; i++) {
    const tab = allTabs[i];
    if (tab.classList.contains('tab-fixed')) continue;
    if (truncated) {
      tab.classList.add('overflow-hidden');
      if (tab.classList.contains('active')) activeHidden = true;
      continue;
    }
    const w = widths[i] + (used > 0 ? gap : 0);
    if (used + w > budget) {
      truncated = true;
      tab.classList.add('overflow-hidden');
      if (tab.classList.contains('active')) activeHidden = true;
      continue;
    }
    used += w;
  }

  if (!truncated) {
    moreBtn.classList.add('hidden');
  }
  moreBtn.classList.toggle('has-active', activeHidden);
}

function scheduleTabOverflow() {
  requestAnimationFrame(() => requestAnimationFrame(applyTabOverflow));
}

let tabResizeObserver = null;
function watchTabsResize() {
  if (tabResizeObserver || !('ResizeObserver' in window)) return;
  tabResizeObserver = new ResizeObserver(() => applyTabOverflow());
  tabResizeObserver.observe(document.body);
}

function statusClass(status) { return status ? `pill ${String(status).toLowerCase()}` : 'pill'; }
function byPath(path) { return state.index.docs.find((d) => d.path === path); }
function currentProject() { return state.index.projects.find((p) => p.slug === state.project) || state.index.projects[0]; }
function projectDocs() { return currentProject().docs.map(byPath).filter(Boolean); }
function isProjectGroup() { return Boolean(currentProject().outline); }
function availableStatuses() { return [...new Set(projectDocs().map((d) => d.status).filter(Boolean).map((s) => String(s).toLowerCase()))]; }
function availableRoles() { return [...new Set(projectDocs().map((d) => d.role).filter(Boolean))]; }

function currentDocs() {
  const docs = projectDocs();
  const filtered = docs.filter((doc) => {
    const q = state.query.toLowerCase();
    const haystack = [doc.title, doc.path, doc.snippet, doc.role, JSON.stringify(doc.frontmatter)].join(' ').toLowerCase();
    const matchesQ = !q || haystack.includes(q);
    const matchesStatus = state.status === 'all' || String(doc.status || '').toLowerCase() === state.status;
    const matchesRole = state.role === 'all' || doc.role === state.role;
    const matchesWorkstream = !state.workstream || doc.path === state.workstream || doc.workstreamPath === state.workstream;
    return matchesQ && matchesStatus && matchesRole && matchesWorkstream;
  });
  const sortField = sortFieldExists(state.sortBy) ? state.sortBy : 'path';
  const sortDir = state.sortDir === 'desc' ? 'desc' : 'asc';
  filtered.sort((a, b) => compareDocs(a, b, sortField, sortDir));
  return filtered;
}

function inlineMd(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink" data-target="$1">$1</span>');
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\.\.?\/|\/)[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
  return s;
}

function isTableSeparator(line) {
  if (!line) return false;
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isBlockStart(line, nextLine) {
  if (!line) return false;
  if (/^\s*```/.test(line)) return true;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^\s*-{3,}\s*$/.test(line)) return true;
  if (/^\s*>/.test(line)) return true;
  if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) return true;
  if (line.includes('|') && nextLine && isTableSeparator(nextLine)) return true;
  return false;
}

function renderCodeBlock(text, lang) {
  const langClass = lang ? ` class="lang-${escapeHtml(lang)}"` : '';
  const langBadge = lang ? `<span class="code-lang" aria-hidden="true">${escapeHtml(lang)}</span>` : '';
  const padClass = lang ? ' has-lang' : '';
  return `<pre class="code${padClass}">${langBadge}${copyButton(text, lang ? `Copy ${lang} code` : 'Copy code', 'pre-copy')}<code${langClass}>${escapeHtml(text)}</code></pre>`;
}

function renderMermaidFallback(source) {
  return `<figure class="mermaid-block">
    <figcaption>Mermaid diagram (source view)</figcaption>
    <pre class="code has-lang">${`<span class="code-lang" aria-hidden="true">mermaid</span>`}${copyButton(source, 'Copy mermaid source', 'pre-copy')}<code class="lang-mermaid">${escapeHtml(source)}</code></pre>
  </figure>`;
}

function renderTable(tableLines) {
  const parseRow = (line) => {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  };
  const aligns = parseRow(tableLines[1]).map((s) => {
    if (/^:-+:$/.test(s)) return 'center';
    if (/^-+:$/.test(s)) return 'right';
    if (/^:-+$/.test(s)) return 'left';
    return null;
  });
  const headers = parseRow(tableLines[0]);
  const headerHtml = `<thead><tr>${headers.map((h, j) => {
    const a = aligns[j] ? ` style="text-align:${aligns[j]}"` : '';
    return `<th${a}>${inlineMd(h)}</th>`;
  }).join('')}</tr></thead>`;
  const rowsHtml = tableLines.slice(2).map((line) => {
    const cells = parseRow(line);
    return `<tr>${cells.map((c, j) => {
      const a = aligns[j] ? ` style="text-align:${aligns[j]}"` : '';
      return `<td${a}>${inlineMd(c)}</td>`;
    }).join('')}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table>${headerHtml}<tbody>${rowsHtml}</tbody></table></div>`;
}

function parseList(lines, start, baseIndent) {
  const items = [];
  let i = start;
  let listType = null;
  let isTaskList = false;

  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!m) break;
    const indent = m[1].length;
    if (indent !== baseIndent) break;
    const isOrdered = /^\d+\./.test(m[2]);
    if (listType === null) listType = isOrdered ? 'ol' : 'ul';
    else if ((listType === 'ol') !== isOrdered) break;

    const content = m[3];
    const taskMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
    let itemHtml;
    let itemClasses = [];
    if (taskMatch) {
      isTaskList = true;
      const checked = taskMatch[1].toLowerCase() === 'x';
      itemClasses.push('task-item');
      if (checked) itemClasses.push('checked');
      const checkSvg = checked
        ? '<svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,7 6,10 11,4"/></svg>'
        : '';
      itemHtml = `<span class="task-marker" aria-hidden="true">${checkSvg}</span><span class="task-text">${inlineMd(taskMatch[2])}</span>`;
    } else {
      itemHtml = inlineMd(content);
    }

    i++;

    let nestedHtml = '';
    while (i < lines.length) {
      const nextLine = lines[i];
      if (!nextLine.trim()) {
        if (i + 1 < lines.length) {
          const peek = lines[i + 1].match(/^(\s*)([-*+]|\d+\.)\s+/);
          if (peek && peek[1].length > baseIndent) { i++; continue; }
        }
        break;
      }
      const nextMatch = nextLine.match(/^(\s*)([-*+]|\d+\.)\s+/);
      if (nextMatch && nextMatch[1].length > baseIndent) {
        const nested = parseList(lines, i, nextMatch[1].length);
        nestedHtml += nested.html;
        i = nested.next;
      } else {
        break;
      }
    }

    const cls = itemClasses.length ? ` class="${itemClasses.join(' ')}"` : '';
    items.push(`<li${cls}>${itemHtml}${nestedHtml}</li>`);
  }

  const tag = listType || 'ul';
  const cls = isTaskList ? ' class="task-list"' : '';
  return { html: `<${tag}${cls}>${items.join('')}</${tag}>`, next: i };
}

function parseBlocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^\s*```(.*)$/);
    if (fence) {
      const lang = (fence[1] || '').trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const codeText = codeLines.join('\n');
      out.push(lang.toLowerCase() === 'mermaid' ? renderMermaidFallback(codeText) : renderCodeBlock(codeText, lang));
      continue;
    }

    if (!line.trim()) { i++; continue; }

    if (/^\s*-{3,}\s*$/.test(line) || /^\s*\*{3,}\s*$/.test(line)) {
      out.push('<hr class="rule"/>');
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(renderTable(tableLines));
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${parseBlocks(quoteLines)}</blockquote>`);
      continue;
    }

    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const indent = (line.match(/^(\s*)/)[1] || '').length;
      const list = parseList(lines, i, indent);
      out.push(list.html);
      i = list.next;
      continue;
    }

    const paraLines = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      out.push(`<p>${inlineMd(paraLines.join(' '))}</p>`);
    } else {
      i++;
    }
  }
  return out.join('\n');
}

function renderMarkdown(markdown) {
  const body = markdown.replace(/^---[\s\S]*?\n---\r?\n/, '');
  const lines = body.split(/\r?\n/);
  const html = parseBlocks(lines);
  return html || '<p class="empty">This document is empty.</p>';
}

async function loadDoc(path) {
  const res = await fetch(`/api/doc?path=${encodeURIComponent(path)}`);
  state.doc = await res.json();
  render();
}

const ELLIPSIS_ICON_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="3.2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="12.8" cy="8" r="1.4"/></svg>';

function renderTabs() {
  const tabs = state.index.projects.map((p) => {
    const classes = ['tab'];
    if (p.slug === state.project) classes.push('active');
    if (p.pinned) classes.push('tab-fixed');
    return `<button class="${classes.join(' ')}" data-project="${p.slug}">
      <span>${escapeHtml(p.title)}</span>
      <span class="count">${p.docs.length}</span>
    </button>`;
  }).join('');

  const dropdownProjects = state.index.projects.filter((p) => !p.pinned);
  const dropdownItems = dropdownProjects.map((p) => (
    `<button class="dropdown-item ${p.slug === state.project ? 'active' : ''}" data-project="${p.slug}" role="menuitem">
      <span>${escapeHtml(p.title)}</span>
      <span class="count">${p.docs.length}</span>
    </button>`
  )).join('');

  const dropdown = dropdownProjects.length
    ? `<div class="tab-dropdown" role="menu" aria-label="More projects">${dropdownItems}</div>`
    : '';

  return `${tabs}
    <button type="button" class="tab-more hidden" data-tab-more aria-label="More projects" aria-expanded="false" aria-haspopup="true">${ELLIPSIS_ICON_SVG}</button>
    ${dropdown}`;
}

function renderFilters() {
  const roles = availableRoles();
  const statuses = availableStatuses();
  const roleLabels = { context: 'context', template: 'templates', spec: 'spec', plan: 'plan', workstream: 'workstreams', task: 'tasks', decision: 'decisions', progress: 'progress' };
  const roleButtons = roles.map((r) => `<button class="filter ${state.role === r ? 'active' : ''}" data-role="${r}">${roleLabels[r] || r}</button>`).join('');
  const statusButtons = statuses.map((s) => `<button class="filter ${state.status === s ? 'active' : ''}" data-status="${s}">${s}</button>`).join('');

  const sortOptions = SORT_FIELDS.map((f) => (
    `<option value="${f.value}" ${state.sortBy === f.value ? 'selected' : ''}>${escapeHtml(f.label)}</option>`
  )).join('');
  const dirIsAsc = state.sortDir !== 'desc';
  const dirIcon = dirIsAsc
    ? '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l4-6 4 6"/></svg>'
    : '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5l4 6 4-6"/></svg>';
  const dirLabel = dirIsAsc ? 'Sort ascending — click to flip to descending' : 'Sort descending — click to flip to ascending';

  return `<div class="filter-group">
      <span class="filter-label">Show</span>
      <button class="filter ${state.role === 'all' ? 'active' : ''}" data-role="all">all</button>
      ${roleButtons}
    </div>
    ${statuses.length
      ? `<div class="filter-group"><span class="filter-label">Status</span><button class="filter ${state.status === 'all' ? 'active' : ''}" data-status="all">all</button>${statusButtons}</div>`
      : '<div class="filter-note">No status filters for this folder.</div>'}
    <div class="filter-group sort-group">
      <span class="filter-label">Sort</span>
      <select class="sort-field" data-sort-field aria-label="Sort field">${sortOptions}</select>
      <button type="button" class="sort-dir" data-sort-dir aria-label="${escapeHtml(dirLabel)}" title="${escapeHtml(dirLabel)}" data-direction="${dirIsAsc ? 'asc' : 'desc'}">${dirIcon}</button>
    </div>
    ${state.workstream ? '<button class="workstream-scope" data-clear-workstream>Showing selected workstream and subtasks x</button>' : ''}`;
}

function renderList() {
  const docs = currentDocs();
  const items = docs.map((doc, i) => (
    `<article class="doc reveal ${state.doc?.path === doc.path ? 'active' : ''}" style="--index:${i}" data-doc="${doc.path}">
      <div class="doc-title">
        <span>${escapeHtml(doc.title)}</span>
        ${doc.status ? `<span class="${statusClass(doc.status)}">${escapeHtml(doc.status)}</span>` : `<span class="pill">${escapeHtml(titleCase(doc.role))}</span>`}
      </div>
      <div class="doc-path">${escapeHtml(doc.path)}</div>
      <div class="doc-snippet">${escapeHtml(doc.snippet)}</div>
    </article>`
  )).join('');

  return `<main class="list reveal">
    <input class="search" placeholder="Search this ${isProjectGroup() ? 'project' : 'folder'}..." value="${escapeHtml(state.query)}" />
    <div class="filters">${renderFilters()}</div>
    ${items || '<div class="empty">No documents match this filter.</div>'}
  </main>`;
}

function renderReader() {
  const doc = state.doc;
  if (!doc) return '<section class="reader reveal"><div class="empty">Select a document.</div></section>';
  const props = Object.entries(doc.frontmatter || {});
  const properties = props.length ? `<div class="properties">${props.map(([k, v]) => {
    const display = normalizeCopyValue(v);
    return `<div class="prop-key">${escapeHtml(k)}</div><div class="prop-value"><span class="prop-text">${escapeHtml(display)}</span>${copyButton(v, `Copy ${k}`)}</div>`;
  }).join('')}</div>` : '';

  const markdownCopyId = registerCopy(doc.markdown);

  return `<section class="reader reveal">
    <div class="reader-inner">
      <header class="reader-head">
        <div class="reader-top">
          <div>
            <div class="eyebrow">${escapeHtml(titleCase(doc.role))}</div>
            <h1>${escapeHtml(doc.title)}</h1>
          </div>
        </div>
        <div class="meta">
          <span class="pill path-pill">${escapeHtml(doc.path)}</span>
          ${copyButton(doc.path, 'Copy path')}
          ${doc.status ? `<span class="${statusClass(doc.status)}">${escapeHtml(doc.status)}</span>` : ''}
          <span class="pill">updated ${escapeHtml(String(doc.updated).slice(0, 10))}</span>
        </div>
        <div class="reader-actions">
          <button class="action" data-open="explorer" title="Open containing folder in system explorer" aria-label="Open in system explorer">
            <img class="action-icon" src="/explorer.svg" alt="" aria-hidden="true" />
            <span class="action-label">Open</span>
          </button>
          <button class="action" data-open="code" title="Open this markdown file in VS Code" aria-label="Open in VS Code">
            <img class="action-icon" src="/vscode.svg" alt="" aria-hidden="true" />
            <span class="action-label">Open</span>
          </button>
          ${markdownCopyId ? `<button type="button" class="action" data-copy="${markdownCopyId}" title="Copy the rendered markdown body" aria-label="Copy markdown">
            <img class="action-icon action-icon-md" src="/markdown.svg" alt="" aria-hidden="true" />
            <span class="action-label">Copy</span>
          </button>` : ''}
        </div>
        <div class="open-feedback" aria-live="polite"></div>
        ${properties}
      </header>
      <article class="markdown">${renderMarkdown(doc.markdown)}</article>
    </div>
  </section>`;
}

async function openCurrentDoc(target) {
  if (!state.doc) return;
  const feedback = $('.open-feedback');
  try {
    const res = await fetch(`/api/open?target=${encodeURIComponent(target)}&path=${encodeURIComponent(state.doc.path)}`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Open action failed.');
    if (feedback) feedback.textContent = target === 'code' ? 'Opened in VS Code.' : 'Opened in system explorer.';
  } catch (error) {
    if (feedback) feedback.textContent = error.message || String(error);
  }
}

function outlineLink(path, label, extra = '') {
  if (!path) return '';
  const doc = byPath(path);
  const active = state.doc?.path === path ? 'active' : '';
  return `<button class="outline-link ${active}" data-doc="${path}"><span>${escapeHtml(label || doc?.title || path)}</span>${extra}</button>`;
}

function renderProjectOutline() {
  const project = currentProject();
  if (!project.outline) {
    return `<aside class="outline reveal">
      <div class="outline-title">Folder guide</div>
      <p class="outline-help">${project.slug === 'context' ? 'Context is repo-level background. Status filters stay hidden because these documents are not delivery tasks.' : 'Templates are reusable contracts. Status filters stay hidden unless this folder contains statuses.'}</p>
    </aside>`;
  }

  const outline = project.outline;
  const labelWithId = (id, title) => {
    if (!id) return title;
    return String(title || '').startsWith(id) ? title : `${id} ${title}`;
  };
  const taskLink = (path) => {
    const task = byPath(path);
    const status = task?.status ? `<span class="${statusClass(task.status)}">${escapeHtml(task.status)}</span>` : '';
    return outlineLink(path, `${task?.taskId ? `${task.taskId} ` : ''}${task?.title || path}`, status);
  };
  const decisions = outline.decisions.map((p) => outlineLink(p, byPath(p)?.title || 'Decisions')).join('');
  const progressLink = outline.progress.length
    ? outlineLink(outline.progress[0], `Progress log (${outline.progress.length})`)
    : '';

  const workstreams = outline.workstreams.map((ws) => (
    `<div class="workstream-block ${state.workstream === ws.path ? 'active' : ''}">
      <button class="outline-link workstream-pick ${state.doc?.path === ws.path ? 'active' : ''}" data-workstream="${ws.path}" data-doc="${ws.path}">
        <span>${escapeHtml(labelWithId(ws.id, ws.title))}</span>
        ${ws.status ? `<span class="${statusClass(ws.status)}">${escapeHtml(ws.status)}</span>` : `<span class="count">${ws.tasks.length}</span>`}
      </button>
      ${state.workstream === ws.path ? `<div class="subtasks">${ws.tasks.map(taskLink).join('') || '<div class="empty small">No subtasks linked yet.</div>'}</div>` : ''}
    </div>`
  )).join('');

  return `<aside class="outline reveal">
    <div class="outline-title">Project outline</div>
    <p class="outline-help">Select a workstream to focus the list and reveal its subtasks.</p>
    <div class="outline-section">
      <div class="outline-label">Core</div>
      ${outlineLink(outline.spec, 'Spec')}
      ${outlineLink(outline.plan, 'Plan')}
      ${decisions}
      ${progressLink}
    </div>
    <div class="outline-section">
      <div class="outline-label">Workstreams and Tasks</div>
      ${workstreams}
      ${outline.unassignedTasks.length ? `<div class="outline-label">Unassigned tasks</div>${outline.unassignedTasks.map(taskLink).join('')}` : ''}
    </div>
  </aside>`;
}

function resetGroupFilters() {
  state.status = 'all';
  state.role = 'all';
  state.workstream = null;
}

function prepareReveal() {
  const nodes = [...document.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  nodes.forEach((node) => observer.observe(node));
}

function render() {
  resetCopyRegistry();
  const outlineClass = state.outlineOpen ? 'outline-open' : '';
  $('#app').innerHTML = `<div class="viewer-frame ${outlineClass}">
    <header class="top-bar">
      <div class="brand-mark">Delano</div>
      <nav class="tabs">${renderTabs()}</nav>
      <button class="outline-toggle" data-outline-toggle>${state.outlineOpen ? 'Hide outline' : 'Show outline'}</button>
    </header>
    <div class="shell">${renderList()}${renderReader()}${renderProjectOutline()}</div>
  </div>`;

  document.querySelectorAll('[data-project]').forEach((el) => el.onclick = () => {
    state.project = el.dataset.project;
    state.doc = null;
    resetGroupFilters();
    const proj = currentProject();
    // Auto-open the outline panel when entering a project view; collapse on context/templates.
    state.outlineOpen = !!(proj && proj.outline);
    // Project views land on the spec by default; fall back to the first sorted doc otherwise.
    if (proj && proj.outline && proj.outline.spec) {
      loadDoc(proj.outline.spec);
      return;
    }
    const first = currentDocs()[0];
    if (first) loadDoc(first.path); else render();
  });
  document.querySelectorAll('[data-doc]').forEach((el) => el.onclick = () => loadDoc(el.dataset.doc));
  document.querySelectorAll('[data-status]').forEach((el) => el.onclick = () => { state.status = el.dataset.status; render(); });
  document.querySelectorAll('[data-role]').forEach((el) => el.onclick = () => {
    state.role = el.dataset.role;
    state.workstream = null;
    if (state.role !== 'all') {
      const firstInRole = currentDocs().find((doc) => doc.role === state.role);
      if (firstInRole) {
        if (state.role === 'workstream') state.workstream = firstInRole.path;
        loadDoc(firstInRole.path);
        return;
      }
    }
    render();
  });
  document.querySelectorAll('[data-workstream]').forEach((el) => el.onclick = () => { state.workstream = el.dataset.workstream; state.role = 'all'; loadDoc(el.dataset.doc); });
  document.querySelectorAll('[data-clear-workstream]').forEach((el) => el.onclick = () => { state.workstream = null; render(); });
  document.querySelectorAll('[data-outline-toggle]').forEach((el) => el.onclick = () => { state.outlineOpen = !state.outlineOpen; render(); });
  document.querySelectorAll('[data-open]').forEach((el) => el.onclick = () => openCurrentDoc(el.dataset.open));
  const sortField = document.querySelector('[data-sort-field]');
  if (sortField) sortField.onchange = (e) => { state.sortBy = e.target.value; render(); };
  document.querySelectorAll('[data-sort-dir]').forEach((el) => el.onclick = () => { state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc'; render(); });
  const search = $('.search');
  if (search) search.oninput = (e) => {
    const caret = e.target.selectionStart;
    state.query = e.target.value;
    render();
    const next = $('.search');
    if (next) {
      next.focus();
      try { next.setSelectionRange(caret, caret); } catch (_) { /* non-text input types */ }
    }
  };
  document.querySelectorAll('.wikilink').forEach((el) => el.onclick = () => { state.query = el.dataset.target; render(); });
  prepareReveal();
  scheduleTabOverflow();
}

(async function init() {
  attachCopyDelegation();
  attachTabDropdownDelegation();
  watchTabsResize();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => applyTabOverflow()).catch(() => {});
  }
  const res = await fetch('/api/index');
  state.index = await res.json();
  const initialProject = currentProject();
  // If the initial project is a project view, reveal the outline and land on its spec.
  if (initialProject && initialProject.outline) {
    state.outlineOpen = true;
    if (initialProject.outline.spec) {
      await loadDoc(initialProject.outline.spec);
      return;
    }
  }
  const first = currentDocs()[0] || state.index.docs[0];
  if (first) await loadDoc(first.path); else render();
})();
