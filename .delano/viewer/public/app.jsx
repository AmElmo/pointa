const { useState, useEffect, useMemo, useCallback } = React;

/* ================================================================
   Icons — hairline 1.4px stroke, 24×24 viewBox
   ================================================================ */
const Icon = ({ d, size = 16, fill = "none", stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const I = {
  home:      <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
  list:      <><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
  block:     <><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/></>,
  trend:     <><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>,
  check:     <><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M8 12.5l3 3 5-6"/></>,
  checkMark:  <path d="M5 12.5l4 4 10-11"/>,
  copy:       <><rect x="8" y="4" width="11" height="14" rx="1.5"/><path d="M16 18v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/></>,
  warn:      <><path d="M12 3.5 21 19H3z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></>,
  doc:       <><path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5V8h4"/></>,
  plan:      <><path d="M4 5.5h16"/><path d="M4 12h16"/><path d="M4 18.5h10"/></>,
  scale:     <><path d="M12 4v16"/><path d="M5 8h14"/><path d="M5 8 3 13h4z"/><path d="M19 8l-2 5h4z"/></>,
  clock:     <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>,
  grid:      <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  task:      <><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M7 8.5h10"/><path d="M7 13h7"/></>,
  folder:    <><path d="M3.5 6.5a2 2 0 0 1 2-2h3.5l2 2h7.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></>,
  gear:      <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  code:      <><path d="m9 8-5 4 5 4"/><path d="m15 8 5 4-5 4"/></>,
  folderOpen:<><path d="M3 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v1H3z"/><path d="M3 10h18l-2 8a2 2 0 0 1-2 1.5H5a2 2 0 0 1-2-1.5z"/></>,
  user:      <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/></>,
  chevR:     <path d="m9 6 6 6-6 6"/>,
  chevD:     <path d="m6 9 6 6 6-6"/>,
  chevU:     <path d="m6 15 6-6 6 6"/>,
  arrowL:    <><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></>,
  lock:      <><rect x="4.5" y="10.5" width="15" height="10" rx="1.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></>,
  search:    <><circle cx="11" cy="11" r="6"/><path d="m20 20-4.3-4.3"/></>,
};

/* ================================================================
   Status utilities
   ================================================================ */
const STATUS_TONE = {
  "Planned":     { dot: "var(--ink-40)" },
  "In Progress": { dot: "var(--accent)" },
  "Complete":    { dot: "var(--ok)" },
  "Blocked":     { dot: "var(--warn)" },
};

const NAV_STATE_KEY = "delano.viewer.navigation.v1";
const NAV_STATE_VERSION = 1;
const DEFAULT_WORKSPACE_ROUTE = "workspace-projects";
const WORKSPACE_PAGE_SIZE = 10;

function statusLabel(raw) {
  if (!raw) return "Planned";
  const s = String(raw).toLowerCase().replace(/[-_]+/g, " ").trim();
  if (s.includes("progress") || s === "active") return "In Progress";
  if (s === "blocked") return "Blocked";
  if (["complete", "done", "approved", "closed"].includes(s)) return "Complete";
  if (["planned", "draft", "ready"].includes(s)) return "Planned";
  return "Planned";
}

const StatusChip = ({ children }) => {
  const label = statusLabel(children);
  const tone = STATUS_TONE[label] || STATUS_TONE["Planned"];
  return (
    <span className="chip">
      <span className="chip-dot" style={{ background: tone.dot }} />
      {label}
    </span>
  );
};

/* ================================================================
   HTML / text utilities
   ================================================================ */
const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const titleCase = (s) =>
  String(s || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeCopyValue = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
};

const isCopyableMetaKey = (key) => {
  const normalized = String(key || "").toLowerCase();
  return (
    normalized === "id" ||
    normalized === "slug" ||
    normalized === "workstream" ||
    normalized === "depends_on" ||
    normalized === "conflicts_with" ||
    /(?:^|_)(?:id|ids)$/.test(normalized)
  );
};

const copyLabelFromMetaKey = (key, role) => {
  const normalized = String(key || "").toLowerCase();
  if (normalized === "id" && role) return `${titleCase(role)} ID`;
  if (normalized === "workstream") return "workstream ID";
  if (normalized === "depends_on") return "dependency IDs";
  if (normalized === "conflicts_with") return "conflict IDs";
  return normalized.replace(/_/g, " ") || "value";
};

async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      /* fall through */
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-1000px";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (_) {
    ok = false;
  }
  document.body.removeChild(textArea);
  return ok;
}

function announceCopy(label) {
  const live = document.getElementById("copy-live");
  if (!live) return;
  live.textContent = "";
  window.setTimeout(() => {
    live.textContent = `Copied ${label || "value"}`;
  }, 10);
}

const formatShortDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const stripRepeatedTitle = (title, text) => {
  const source = String(text || "").trim();
  const heading = String(title || "").trim();
  if (!source || !heading) return source;
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source
    .replace(new RegExp(`^#{1,6}\\s+${escaped}\\s*`, "i"), "")
    .replace(new RegExp(`^${escaped}\\s+`, "i"), "")
    .trim();
};

/* ================================================================
   Markdown rendering (ported from original Delano viewer)
   ================================================================ */
function inlineMd(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, "$1<em>$2</em>");
  s = s.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink">$1</span>');
  s = s.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\.\.?\/|\/)[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>'
  );
  return s;
}

function isTableSeparator(line) {
  return line ? /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line) : false;
}

function isBlockStart(line, nextLine) {
  if (!line) return false;
  if (/^\s*```/.test(line)) return true;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^\s*-{3,}\s*$/.test(line)) return true;
  if (/^\s*>/.test(line)) return true;
  if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) return true;
  if (line.includes("|") && nextLine && isTableSeparator(nextLine)) return true;
  return false;
}

function renderCodeBlock(text, lang) {
  const langBadge = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : "";
  const padClass = lang ? " has-lang" : "";
  return `<pre class="code${padClass}">${langBadge}<code>${escapeHtml(text)}</code></pre>`;
}

function renderTable(tableLines) {
  const parseRow = (line) => {
    let s = line.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|")) s = s.slice(0, -1);
    return s.split("|").map((c) => c.trim());
  };
  const aligns = parseRow(tableLines[1]).map((s) => {
    if (/^:-+:$/.test(s)) return "center";
    if (/^-+:$/.test(s)) return "right";
    if (/^:-+$/.test(s)) return "left";
    return null;
  });
  const headers = parseRow(tableLines[0]);
  const headerHtml =
    "<thead><tr>" +
    headers.map((h, j) => {
        const a = aligns[j] ? ` style="text-align:${aligns[j]}"` : "";
        return `<th${a}>${inlineMd(h)}</th>`;
      }).join("") +
    "</tr></thead>";
  const rowsHtml = tableLines
    .slice(2)
    .map((line) => {
      const cells = parseRow(line);
      return (
        "<tr>" +
        cells.map((c, j) => {
            const a = aligns[j] ? ` style="text-align:${aligns[j]}"` : "";
            return `<td${a}>${inlineMd(c)}</td>`;
          }).join("") +
        "</tr>"
      );
    })
    .join("");
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
    if (listType === null) listType = isOrdered ? "ol" : "ul";
    else if ((listType === "ol") !== isOrdered) break;

    const content = m[3];
    const taskMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
    let itemHtml;
    const itemClasses = [];
    if (taskMatch) {
      isTaskList = true;
      const checked = taskMatch[1].toLowerCase() === "x";
      itemClasses.push("task-item");
      if (checked) itemClasses.push("checked");
      const checkSvg = checked
        ? '<svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,7 6,10 11,4"/></svg>'
        : "";
      itemHtml = `<span class="task-marker">${checkSvg}</span><span class="task-text">${inlineMd(taskMatch[2])}</span>`;
    } else {
      itemHtml = inlineMd(content);
    }

    i++;
    let nestedHtml = "";
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

    const cls = itemClasses.length ? ` class="${itemClasses.join(" ")}"` : "";
    items.push(`<li${cls}>${itemHtml}${nestedHtml}</li>`);
  }

  const tag = listType || "ul";
  const cls = isTaskList ? ' class="task-list"' : "";
  return { html: `<${tag}${cls}>${items.join("")}</${tag}>`, next: i };
}

function parseBlocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^\s*```(.*)$/);
    if (fence) {
      const lang = (fence[1] || "").trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { codeLines.push(lines[i]); i++; }
      i++;
      out.push(renderCodeBlock(codeLines.join("\n"), lang));
      continue;
    }

    if (!line.trim()) { i++; continue; }

    if (/^\s*-{3,}\s*$/.test(line) || /^\s*\*{3,}\s*$/.test(line)) {
      out.push("<hr/>");
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

    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) { tableLines.push(lines[i]); i++; }
      out.push(renderTable(tableLines));
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { quoteLines.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out.push(`<blockquote>${parseBlocks(quoteLines)}</blockquote>`);
      continue;
    }

    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const indent = (line.match(/^(\s*)/)[1] || "").length;
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
      out.push(`<p>${inlineMd(paraLines.join(" "))}</p>`);
    } else {
      i++;
    }
  }
  return out.join("\n");
}

function renderMarkdown(markdown) {
  const body = markdown.replace(/^---[\s\S]*?\n---\r?\n/, "");
  return parseBlocks(body.split(/\r?\n/)) || '<p class="empty-state">This document is empty.</p>';
}

/* ================================================================
   Data helpers
   ================================================================ */
function byPath(docs, path) {
  return docs.find((d) => d.path === path);
}

function getProjectData(index, slug) {
  if (!index) return { project: null, docs: [] };
  const project = index.projects.find((p) => p.slug === slug) || index.projects[0];
  if (!project) return { project: null, docs: [] };
  const docs = project.docs.map((p) => byPath(index.docs, p)).filter(Boolean);
  return { project, docs };
}

function computeHealth(docs) {
  const tasks = docs.filter((d) => d.role === "task");
  if (!tasks.length) return { pct: 0, label: "No tasks" };
  const done = tasks.filter((d) => statusLabel(d.status) === "Complete").length;
  const pct = Math.round((done / tasks.length) * 100);
  const remaining = tasks.length - done;
  return { pct, label: remaining > 0 ? `${remaining} of ${tasks.length} incomplete` : "All tasks complete" };
}

function computeWarnings(project, docs) {
  const warnings = [];
  const tasks = docs.filter((d) => d.role === "task");
  const noStatus = tasks.filter((d) => !d.status);
  if (noStatus.length) {
    warnings.push({ sev: "Medium", note: `${noStatus.length} task(s) missing status field`, ws: "Tasks" });
  }
  if (project.outline) {
    const ws = project.outline.workstreams || [];
    const emptyWs = ws.filter((w) => !w.tasks || !w.tasks.length);
    if (emptyWs.length) {
      warnings.push({ sev: "Low", note: `${emptyWs.length} workstream(s) have no linked tasks`, ws: "Workstreams" });
    }
    if (project.outline.unassignedTasks?.length) {
      warnings.push({ sev: "Low", note: `${project.outline.unassignedTasks.length} task(s) not assigned to a workstream`, ws: "Tasks" });
    }
  }
  const blocked = tasks.filter((d) => statusLabel(d.status) === "Blocked");
  if (blocked.length) {
    warnings.push({ sev: "Medium", note: `${blocked.length} task(s) currently blocked`, ws: "Tasks" });
  }
  return warnings;
}

function getDashboardModel(project, docs) {
  const tasks = docs.filter((d) => d.role === "task");
  const currentWork = tasks.filter((d) => statusLabel(d.status) === "In Progress");
  const blockers = tasks.filter((d) => statusLabel(d.status) === "Blocked");
  const progressDocs = docs
    .filter((d) => d.role === "progress")
    .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  const health = computeHealth(docs);
  const warnings = computeWarnings(project, docs);
  const workstreams = project.outline?.workstreams || [];
  const wsLookup = {};

  workstreams.forEach((ws) => {
    (ws.tasks || []).forEach((taskPath) => {
      wsLookup[taskPath] = ws;
    });
  });

  return { tasks, currentWork, blockers, progressDocs, health, warnings, workstreams, wsLookup };
}

function getWorkspaceModel(index) {
  const model = {
    current: [],
    blockers: [],
    validation: [],
    progress: [],
    warnings: [],
    counts: { projects: 0, current: 0, blockers: 0, validation: 0, progress: 0, warnings: 0 },
  };

  if (!index) return model;

  for (const project of index.projects || []) {
    if (!project.outline) continue;
    const docs = (project.docs || []).map((p) => byPath(index.docs, p)).filter(Boolean);
    const dashboard = getDashboardModel(project, docs);
    const withProject = (item, extra = {}) => ({ ...item, project, ...extra });

    dashboard.currentWork.forEach((task) => {
      model.current.push(withProject(task, { workstream: dashboard.wsLookup[task.path] || null }));
    });
    dashboard.blockers.forEach((task) => {
      model.blockers.push(withProject(task, { workstream: dashboard.wsLookup[task.path] || null }));
    });
    dashboard.tasks.forEach((task) => {
      model.validation.push(withProject(task, { workstream: dashboard.wsLookup[task.path] || null }));
    });
    dashboard.progressDocs.forEach((doc) => {
      model.progress.push(withProject(doc));
    });
    dashboard.warnings.forEach((warning) => {
      model.warnings.push({ ...warning, project });
    });
  }

  const byUpdatedDesc = (a, b) => (b.updated || b.project?.updated || "").localeCompare(a.updated || a.project?.updated || "");
  model.current.sort(byUpdatedDesc);
  model.blockers.sort(byUpdatedDesc);
  model.validation.sort(byUpdatedDesc);
  model.progress.sort(byUpdatedDesc);
  model.warnings.sort((a, b) => (b.project?.updated || "").localeCompare(a.project?.updated || ""));

  model.counts.current = model.current.length;
  model.counts.blockers = model.blockers.length;
  model.counts.validation = model.validation.length;
  model.counts.progress = model.progress.length;
  model.counts.warnings = model.warnings.length;
  model.counts.projects = (index.projects || []).filter((p) => p.outline).length;

  return model;
}

function getProjectStats(index, project) {
  const docs = (project.docs || []).map((p) => byPath(index.docs, p)).filter(Boolean);
  const dashboard = getDashboardModel(project, docs);
  const relatedAssets = docs.filter((doc) => !["task", "workstream"].includes(doc.role)).length;
  const openTasks = dashboard.tasks.filter((task) => statusLabel(task.status) !== "Complete");
  const latestDoc = docs
    .slice()
    .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""))[0];

  return {
    project,
    docs,
    dashboard,
    tasks: dashboard.tasks,
    openTasks,
    workstreams: dashboard.workstreams,
    relatedAssets,
    updated: latestDoc?.updated || project.created || "",
  };
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pageCountFor(items, pageSize = WORKSPACE_PAGE_SIZE) {
  return Math.max(1, Math.ceil((items?.length || 0) / pageSize));
}

function clampPage(page, totalPages) {
  const parsed = Number(page);
  const next = Number.isFinite(parsed) ? Math.floor(parsed) : 1;
  return Math.min(Math.max(1, next), Math.max(1, totalPages));
}

function paginateItems(items, page, pageSize = WORKSPACE_PAGE_SIZE) {
  const totalPages = pageCountFor(items, pageSize);
  const safePage = clampPage(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    visible: (items || []).slice(start, start + pageSize),
    safePage,
    totalPages,
  };
}

const LinkButton = ({ children, title, className = "", ...props }) => (
  <button
    {...props}
    className={`link${className ? ` ${className}` : ""}`}
    title={title || (typeof children === "string" ? children : undefined)}
    type={props.type || "button"}
  >
    {children}
  </button>
);

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination" aria-label="Pagination">
      <button
        className="btn"
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Previous
      </button>
      <span className="mono">Page {page} of {totalPages}</span>
      <button
        className="btn"
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Next
      </button>
    </div>
  );
};

/* ================================================================
   Reusable components
   ================================================================ */
const CopyButton = ({ value, label = "value", className = "" }) => {
  const [copied, setCopied] = useState(false);
  const text = normalizeCopyValue(value);

  useEffect(() => {
    if (!copied) return undefined;
    const timeout = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  if (!text) return null;

  const stateLabel = copied ? `Copied ${label}` : `Copy ${label}`;
  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const ok = await copyTextToClipboard(text);
    if (!ok) return;
    setCopied(true);
    announceCopy(label);
  };

  return (
    <button
      className={`copy-btn${copied ? " is-copied" : ""}${className ? ` ${className}` : ""}`}
      type="button"
      onClick={handleClick}
      aria-label={stateLabel}
      title={stateLabel}
    >
      <Icon d={copied ? I.checkMark : I.copy} size={13} />
    </button>
  );
};

const Field = ({ label, children, mono, copyValue, copyLabel }) => (
  <div className="field">
    <div className="field-label">{label}</div>
    <div className={"field-value" + (mono ? " mono" : "")}>
      {children}
      <CopyButton value={copyValue} label={copyLabel || label} />
    </div>
  </div>
);

const SectionHeader = ({ title, count, right, collapsible, open, onToggle }) => (
  <div
    className={"section-head" + (collapsible ? " is-collapsible" : "")}
    onClick={collapsible ? onToggle : undefined}
    role={collapsible ? "button" : undefined}
  >
    <div className="section-title">
      <span>{title}</span>
      {count != null && <span className="count">{count}</span>}
    </div>
    <div className="section-right">
      {right}
      {collapsible && (
        <span className="caret">
          <Icon d={open ? I.chevU : I.chevD} size={16} />
        </span>
      )}
    </div>
  </div>
);

const Block = ({ title, children }) => (
  <section className="ws-block">
    <h3 className="ws-h">{title}</h3>
    <div className="ws-body">{children}</div>
  </section>
);

/* ================================================================
   Navigation definitions
   ================================================================ */
const NAV = [
  { id: "overview", label: "Overview", icon: I.home },
  { id: "current", label: "Current Work", icon: I.list },
  { id: "blockers", label: "Blockers", icon: I.block },
  { id: "progress", label: "Progress", icon: I.trend },
  { id: "validation", label: "Validation", icon: I.check },
  { id: "warnings", label: "Warnings", icon: I.warn },
];

const GLOBAL_NAV = [
  { id: "workspace-projects", label: "Projects", icon: I.grid, countKey: "projects" },
  { id: "workspace-current", label: "Open work", icon: I.list, countKey: "current" },
  { id: "workspace-progress", label: "Progress", icon: I.trend, countKey: "progress" },
  { id: "workspace-validation", label: "Validation", icon: I.check, countKey: "validation" },
  { id: "workspace-warnings", label: "Warnings", icon: I.warn, countKey: "warnings" },
  { id: "workspace-blockers", label: "Blockers", icon: I.block, countKey: "blockers" },
];

const GLOBAL_ROUTES = new Set(GLOBAL_NAV.map((item) => item.id));

function readStoredNavigation() {
  try {
    const raw = window.localStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version === NAV_STATE_VERSION ? parsed : null;
  } catch (_) {
    return null;
  }
}

function sanitizeWorkspacePages(value) {
  const pages = {};
  if (!value || typeof value !== "object") return pages;
  GLOBAL_NAV.forEach((item) => {
    const page = Number(value[item.id]);
    if (Number.isFinite(page) && page > 1) pages[item.id] = Math.floor(page);
  });
  return pages;
}

function findProjectForDoc(index, docPath) {
  if (!docPath) return null;
  return (index.projects || []).find((project) => (project.docs || []).includes(docPath)) || null;
}

function projectHasWorkstream(project, wsPath) {
  return !!project?.outline?.workstreams?.some((ws) => ws.path === wsPath);
}

function fallbackRouteForProject(project) {
  return project?.outline ? "overview" : "list";
}

function makeDefaultNavigation(index) {
  const firstProject = (index.projects || []).find((p) => p.outline) || (index.projects || [])[0] || null;
  return {
    projectSlug: firstProject?.slug || null,
    route: DEFAULT_WORKSPACE_ROUTE,
    section: null,
    docPath: null,
    wsPath: null,
    workspacePages: {},
  };
}

function restoreNavigation(index) {
  const fallback = makeDefaultNavigation(index);
  const stored = readStoredNavigation();
  if (!stored) return fallback;

  let project = (index.projects || []).find((p) => p.slug === stored.projectSlug) || null;
  if (!project) project = (index.projects || []).find((p) => p.slug === fallback.projectSlug) || null;
  if (!project) return fallback;

  const workspacePages = sanitizeWorkspacePages(stored.workspacePages);
  if (GLOBAL_ROUTES.has(stored.route)) {
    return {
      ...fallback,
      projectSlug: project.slug,
      route: stored.route,
      workspacePages,
    };
  }

  if (stored.route === "document" && stored.docPath) {
    const docProject = findProjectForDoc(index, stored.docPath);
    if (docProject) {
      return {
        projectSlug: docProject.slug,
        route: "document",
        section: stored.docPath,
        docPath: stored.docPath,
        wsPath: projectHasWorkstream(docProject, stored.wsPath) ? stored.wsPath : null,
        workspacePages,
      };
    }
  }

  if (stored.route === "workstream" && projectHasWorkstream(project, stored.wsPath)) {
    return {
      projectSlug: project.slug,
      route: "workstream",
      section: null,
      docPath: null,
      wsPath: stored.wsPath,
      workspacePages,
    };
  }

  const projectRoutes = project.outline ? new Set(["overview", "workstreams", "tasks"]) : new Set(["list"]);
  if (projectRoutes.has(stored.route)) {
    return {
      projectSlug: project.slug,
      route: stored.route,
      section: stored.section || (stored.route === "overview" ? "overview" : null),
      docPath: null,
      wsPath: null,
      workspacePages,
    };
  }

  return {
    ...fallback,
    projectSlug: project.slug,
    route: fallbackRouteForProject(project),
    section: project.outline ? "overview" : null,
    workspacePages,
  };
}

function getTaskNavigation(index, project, taskDoc) {
  if (!index || !project?.outline || !taskDoc || taskDoc.role !== "task") return null;
  const workstreams = project.outline.workstreams || [];
  let parent = workstreams.find((ws) => (ws.tasks || []).includes(taskDoc.path)) || null;
  if (!parent && taskDoc.workstreamId) {
    parent = workstreams.find((ws) => ws.id === taskDoc.workstreamId) || null;
  }

  const tasks = (project.docs || [])
    .map((path) => byPath(index.docs, path))
    .filter((doc) => doc?.role === "task");
  const tasksById = {};
  tasks.forEach((task) => {
    if (task.taskId) tasksById[String(task.taskId).toUpperCase()] = task;
  });

  return {
    parent,
    siblings: parent ? (parent.tasks || []).map((path) => byPath(index.docs, path)).filter(Boolean) : [],
    tasksById,
  };
}

function listValue(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)];
}

/* ================================================================
   Sidebar
   ================================================================ */
function Sidebar({ index, projectSlug, route, section, onNavigate, onSelectProject }) {
  const projects = index?.projects || [];
  const current = projects.find((p) => p.slug === projectSlug);
  const hasOutline = current?.outline;
  const globalCounts = useMemo(
    () => (index ? getWorkspaceModel(index).counts : {}),
    [index]
  );

  const contractItems = useMemo(() => {
    if (!hasOutline) return [];
    const items = [];
    if (current.outline.spec) items.push({ id: "spec", label: "Spec", icon: I.doc, path: current.outline.spec });
    if (current.outline.plan) items.push({ id: "plan", label: "Plan", icon: I.plan, path: current.outline.plan });
    (current.outline.decisions || []).forEach((p, i) =>
      items.push({ id: `dec-${i}`, label: "Decisions", icon: I.scale, path: p })
    );
    (current.outline.progress || []).forEach((p, i) =>
      items.push({ id: `prog-${i}`, label: i === 0 ? "Progress log" : `Progress ${i + 1}`, icon: I.clock, path: p })
    );
    return items;
  }, [current, hasOutline]);

  return (
    <aside className="sidebar">
      <div className="brand" aria-label="Delano">
        <img className="brand-logo" src="/delano-logo.svg" alt="Delano" />
      </div>

      <div className="nav-section">Workspace</div>
      <nav className="nav">
        {GLOBAL_NAV.map((it) => (
          <button
            key={it.id}
            className={"nav-item nav-item-count" + (route === it.id ? " is-active" : "")}
            onClick={() => onNavigate(it.id)}
            type="button"
          >
            <span className="nav-ico">
              <Icon d={it.icon} size={16} />
            </span>
            <span className="nav-label">{it.label}</span>
            <span className="nav-count mono">{globalCounts[it.countKey] || 0}</span>
          </button>
        ))}
      </nav>

      <div className="nav-section">Selected project</div>
      <div className="project-select-v3">
        <span className="project-select-mark">
          <Icon d={current?.outline ? I.grid : I.folder} size={15} />
        </span>
        <select
          className="project-select-control"
          value={projectSlug || ""}
          onChange={(e) => onSelectProject(e.target.value)}
          aria-label="Project"
        >
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {hasOutline && (
        <>
          <nav className="nav">
            <button
              className={"nav-item" + (route === "overview" ? " is-active" : "")}
              onClick={() => onNavigate("overview")}
              type="button"
            >
              <span className="nav-ico">
                <Icon d={I.home} size={16} />
              </span>
              <span>Project overview</span>
            </button>
          </nav>


          <div className="nav-section">Source contracts</div>
          <nav className="nav source-nav-v2">
            {contractItems.filter((it) => !it.id.startsWith("prog-")).map((it) => (
              <button key={it.id} className={"nav-item" + (route === "document" && section === it.path ? " is-active" : "")} onClick={() => onNavigate("document", it.path)} type="button">
                <span className="nav-ico"><Icon d={it.icon} size={16} /></span>
                <span>{it.label}</span>
              </button>
            ))}
            <button className={"nav-item" + (route === "workstreams" ? " is-active" : "")} onClick={() => onNavigate("workstreams")} type="button">
              <span className="nav-ico"><Icon d={I.grid} size={16} /></span>
              <span>Workstreams</span>
            </button>
            <button className={"nav-item" + (route === "tasks" ? " is-active" : "")} onClick={() => onNavigate("tasks")} type="button">
              <span className="nav-ico"><Icon d={I.task} size={16} /></span>
              <span>Tasks</span>
            </button>
            <div className="nav-break">Progress</div>
            {contractItems.filter((it) => it.id.startsWith("prog-")).map((it) => (
              <button key={it.id} className={"nav-item" + (route === "document" && section === it.path ? " is-active" : "")} onClick={() => onNavigate("document", it.path)} type="button">
                <span className="nav-ico"><Icon d={it.icon} size={16} /></span>
                <span>{it.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      <div className="sidebar-foot">
        <button className="nav-item" type="button">
          <span className="nav-ico">
            <Icon d={I.gear} size={16} />
          </span>
          <span>Viewer settings</span>
        </button>
      </div>
    </aside>
  );
}

/* ================================================================
   Topbar
   ================================================================ */
function Topbar({ project, index, docPath, onOpenAction }) {
  const spec = project?.outline?.spec;
  const specDoc = spec && index ? byPath(index.docs, spec) : null;
  const title = project?.title || "Delano";
  const status = specDoc?.status || project?.status;
  const updated = specDoc?.updated || "";
  const dateStr = updated
      ? new Date(updated).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : "";

  return (
    <header className="topbar">
      <div className="tb-project">
        <span className="tb-title">{title}</span>
        {status && <StatusChip>{status}</StatusChip>}
      </div>
      <div className="tb-meta">
        {dateStr && (
          <>
            <span>Last updated <strong>{dateStr}</strong></span>
            <span className="tb-sep" />
          </>
        )}
        <span className="tb-readonly">
          <Icon d={I.lock} size={13} /> Read-only
        </span>
      </div>
      <div className="tb-actions">
        {docPath && (
          <>
            <button className="btn" onClick={() => onOpenAction("code", docPath)}>
              <Icon d={I.code} size={14} /> Open in IDE
            </button>
            <button className="btn" onClick={() => onOpenAction("explorer", docPath)}>
              <Icon d={I.folderOpen} size={14} /> Open folder
            </button>
          </>
        )}
      </div>
    </header>
  );
}

/* ================================================================
   Overview
   ================================================================ */
function Overview({ index, project, docs, scrollTarget, onOpenWorkstream, onOpenDoc, onOpenTasks }) {
  const [open, setOpen] = useState({ current: true, blockers: true, validation: false, progress: false, warnings: false });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const dashboard = useMemo(() => getDashboardModel(project, docs), [project, docs]);
  const { tasks, blockers, progressDocs, health, warnings, workstreams, wsLookup } = dashboard;
  const taskByPath = {};
  tasks.forEach((task) => {
    taskByPath[task.path] = task;
  });
  const openTasks = tasks
    .filter((task) => statusLabel(task.status) !== "Complete")
    .sort((a, b) => {
      const rank = { Blocked: 0, "In Progress": 1, Planned: 2, Complete: 3 };
      const statusDelta = (rank[statusLabel(a.status)] ?? 4) - (rank[statusLabel(b.status)] ?? 4);
      if (statusDelta !== 0) return statusDelta;
      return (b.updated || "").localeCompare(a.updated || "");
    });
  const workstreamRows = workstreams
    .map((ws) => {
      const wsTasks = (ws.tasks || []).map((path) => taskByPath[path]).filter(Boolean);
      const openCount = wsTasks.filter((task) => statusLabel(task.status) !== "Complete").length;
      return { ...ws, tasks: wsTasks, openCount };
    })
    .sort((a, b) => b.openCount - a.openCount || a.title.localeCompare(b.title));

  const nextAction = blockers.length
    ? "Resolve blocked tasks"
    : health.pct < 100
    ? "Complete remaining tasks"
    : "All tasks complete";

  // Auto-open + scroll to section from sidebar nav
  useEffect(() => {
    if (!scrollTarget || scrollTarget === "overview") return;
    const sectionKey = scrollTarget.replace("-nav", "");
    if (["blockers", "validation", "progress", "warnings", "current"].includes(sectionKey)) {
      setOpen((o) => ({ ...o, [sectionKey]: true }));
      setTimeout(() => {
        const el = document.getElementById(`section-${sectionKey}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [scrollTarget]);

  return (
    <div className="page overview-v1">
      <div className="overview-v1-head">
        <h1 className="page-title">Overview</h1>
        <div className="overview-signal-strip signal-color-filled">
          <button className={"signal-pill signal-pill-warning" + (warnings.length ? " has-count" : " is-zero")} onClick={() => toggle("warnings")} type="button">
            <Icon d={I.warn} size={14} />
            <span>Warnings</span>
            <span className="mono">{warnings.length}</span>
          </button>
          <button className={"signal-pill signal-pill-blocker" + (blockers.length ? " has-count" : " is-zero")} onClick={() => toggle("blockers")} type="button">
            <Icon d={I.block} size={14} />
            <span>Blockers</span>
            <span className="mono">{blockers.length}</span>
          </button>
          <button className={"signal-pill signal-pill-validation" + (tasks.length ? " has-count" : " is-zero")} onClick={() => toggle("validation")} type="button">
            <Icon d={I.check} size={14} />
            <span>Validation</span>
            <span className="mono">{tasks.length}</span>
          </button>
          <button className={"signal-pill signal-pill-progress" + (progressDocs.length ? " has-count" : " is-zero")} onClick={() => toggle("progress")} type="button">
            <Icon d={I.trend} size={14} />
            <span>Progress</span>
            <span className="mono">{progressDocs.length}</span>
          </button>
        </div>
      </div>

      <section className="summary overview-summary">
        <Field label="Project" copyValue={project.slug} copyLabel="project ID">
          <span>{project.title}</span>
          <span className="field-id mono">{project.slug}</span>
        </Field>
        <Field label="Status"><StatusChip>{project.status || "Planned"}</StatusChip></Field>
        <Field label="Health">
          <span className="health">
            <span className="health-bar"><span className="health-fill" style={{ width: `${health.pct}%`, background: health.pct === 100 ? "var(--ok)" : undefined }} /></span>
            <span className="health-label">{health.label}</span>
          </span>
        </Field>
        <Field label="Next action">{nextAction}</Field>
      </section>

      <section className="overview-delivery">
        <div className="delivery-panel">
          <SectionHeader title="Workstreams" count={workstreams.length} />
          {workstreamRows.length > 0 ? (
            <div className="delivery-list">
              {workstreamRows.map((ws) => (
                <button className="delivery-row" key={ws.path} type="button" onClick={() => onOpenWorkstream(ws.path)}>
                  <span className="delivery-row-main">
                    <span className="delivery-title">{ws.title}</span>
                    <span className="delivery-meta">{ws.tasks.length} task{ws.tasks.length !== 1 ? "s" : ""}</span>
                  </span>
                  <span className="delivery-row-right">
                    <span className="mono delivery-count">{ws.openCount} open</span>
                    <StatusChip>{ws.status || "Planned"}</StatusChip>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">No workstreams in this project.</div>
          )}
        </div>

        <div className="delivery-panel">
          <SectionHeader
            title="Open tasks"
            count={openTasks.length}
            right={<button className="link-muted" type="button" onClick={onOpenTasks}>All tasks</button>}
          />
          {openTasks.length > 0 ? (
            <div className="delivery-list">
              {openTasks.slice(0, 7).map((task) => {
                const ws = wsLookup[task.path];
                return (
                  <div className="delivery-task-row" key={task.path}>
                    <LinkButton onClick={() => onOpenDoc(task.path)} title={task.title}>{task.title}</LinkButton>
                    <span className="td-muted">{ws?.title || "Unassigned"}</span>
                    <StatusChip>{task.status || "Planned"}</StatusChip>
                  </div>
                );
              })}
              {openTasks.length > 7 && (
                <button className="delivery-more" type="button" onClick={onOpenTasks}>
                  {openTasks.length - 7} more open task{openTasks.length - 7 !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          ) : (
            <div className="empty-state">No open tasks.</div>
          )}
        </div>
      </section>

      <section className="overview-priority">
        <div className="overview-priority-main">
          <SectionHeader title="Warnings" count={warnings.length} collapsible open={open.warnings} onToggle={() => toggle("warnings")} />
          {warnings.length > 0 ? (
            <div className="preview-list">
              {warnings.slice(0, open.warnings ? warnings.length : 3).map((w, i) => (
                <div className="preview-row preview-row-warn" key={i}>
                  <span className={`chip ${w.sev === "Medium" ? "chip-warn" : "chip-low"}`}><span className="chip-dot" /> {w.sev}</span>
                  <span className="td-primary">{w.note}</span>
                  <span className="td-muted">{w.ws}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No warnings.</div>
          )}
        </div>
      </section>

      <section className="block">
        <SectionHeader title="Progress" count={progressDocs.length} collapsible open={open.progress} onToggle={() => toggle("progress")} />
        {progressDocs.length > 0 ? (
          <div className="preview-list">
            {progressDocs.slice(0, open.progress ? progressDocs.length : 3).map((doc, i) => {
              const progressMeta = formatShortDateTime(doc.updated);
              const progressSnippet = stripRepeatedTitle(doc.title, doc.snippet);
              return (
                <div className="preview-row preview-row-progress" key={i}>
                  <span className="mono preview-meta-time">{progressMeta}</span>
                  <LinkButton onClick={() => onOpenDoc(doc.path)} title={doc.title}>{doc.title}</LinkButton>
                  <span className="preview-copy">{progressSnippet}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No progress entries.</div>
        )}
      </section>

      <section className="block">
        <SectionHeader title="Validation" count={tasks.length} collapsible open={open.validation} onToggle={() => toggle("validation")} />
        <div className="preview-list preview-list-validation">
          {tasks.slice(0, open.validation ? tasks.length : 3).map((task, i) => {
            const label = statusLabel(task.status);
            const chipClass = label === "Complete" ? "chip-ok" : label === "Blocked" ? "chip-warn" : "chip-low";
            return (
              <div className="preview-row validation-row" key={i}>
                <span className={`chip ${chipClass}`}><span className="chip-dot" /> {label}</span>
                <LinkButton onClick={() => onOpenDoc(task.path)} title={task.title}>{task.title}</LinkButton>
                <span className="td-muted">{(wsLookup[task.path]?.title) || "Unassigned"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="page-foot mono">viewer · read-only · generated from contracts at <span>{index.generatedAt || ""}</span></div>
    </div>
  );
}

/* ================================================================
   Workspace Pages
   ================================================================ */
function WorkspacePage({ index, view, page, onPageChange, onOpenProject, onOpenProjectDoc, onOpenProjectWorkstream }) {
  const [projectFilter, setProjectFilter] = useState("all");
  const workspace = useMemo(() => getWorkspaceModel(index), [index]);
  const projectStats = useMemo(
    () => (index.projects || []).filter((p) => p.outline).map((project) => getProjectStats(index, project)),
    [index]
  );
  const projectFilterCounts = useMemo(() => {
    const active = projectStats.filter((stat) => statusLabel(stat.project.status) !== "Complete").length;
    return {
      all: projectStats.length,
      active,
      complete: projectStats.length - active,
    };
  }, [projectStats]);
  const filteredProjectStats = useMemo(() => {
    if (projectFilter === "active") {
      return projectStats.filter((stat) => statusLabel(stat.project.status) !== "Complete");
    }
    if (projectFilter === "complete") {
      return projectStats.filter((stat) => statusLabel(stat.project.status) === "Complete");
    }
    return projectStats;
  }, [projectFilter, projectStats]);
  const currentPage = page || 1;

  const titleMap = {
    "workspace-projects": "Projects",
    "workspace-current": "Open work",
    "workspace-progress": "Progress",
    "workspace-validation": "Validation",
    "workspace-warnings": "Warnings",
    "workspace-blockers": "Blockers",
  };
  const title = titleMap[view] || "Workspace";
  const itemsForView =
    view === "workspace-projects" ? filteredProjectStats :
    view === "workspace-current" ? workspace.current :
    view === "workspace-blockers" ? workspace.blockers :
    view === "workspace-validation" ? workspace.validation :
    view === "workspace-progress" ? workspace.progress :
    view === "workspace-warnings" ? workspace.warnings :
    [];

  useEffect(() => {
    const totalPages = pageCountFor(itemsForView);
    const safePage = clampPage(currentPage, totalPages);
    if (safePage !== currentPage) onPageChange(safePage);
  }, [view, itemsForView.length, currentPage, onPageChange]);

  const projectButton = (project) => (
    <LinkButton onClick={() => onOpenProject(project.slug)} title={project.title}>
      {project.title}
    </LinkButton>
  );

  const workstreamButton = (item) =>
    item.workstream ? (
      <LinkButton onClick={() => onOpenProjectWorkstream(item.project.slug, item.workstream.path)} title={item.workstream.title}>
        {item.workstream.title}
      </LinkButton>
    ) : (
      <span className="td-muted">-</span>
    );

  const renderPagination = (pagination) => (
    <Pagination page={pagination.safePage} totalPages={pagination.totalPages} onPageChange={onPageChange} />
  );

  const projectFilterControl = view === "workspace-projects" ? (
    <div className="project-filter" aria-label="Project status filter">
      {[
        ["all", "All"],
        ["active", "Active"],
        ["complete", "Complete"],
      ].map(([value, label]) => (
        <button
          className={"project-filter-option" + (projectFilter === value ? " is-active" : "")}
          type="button"
          onClick={() => setProjectFilter(value)}
          aria-pressed={projectFilter === value}
          key={value}
        >
          <span>{label}</span>
          <span className="mono">{projectFilterCounts[value]}</span>
        </button>
      ))}
    </div>
  ) : null;

  const renderProjects = () =>
    filteredProjectStats.length > 0 ? (
      <div className="project-grid">
        {filteredProjectStats.map((stat) => (
          <button className="project-card" key={stat.project.slug} type="button" onClick={() => onOpenProject(stat.project.slug)}>
            <span className="project-card-head">
              <span className="project-card-title">{stat.project.title}</span>
              <StatusChip>{stat.project.status || "Planned"}</StatusChip>
            </span>
            <span className="project-card-dates">
              <span><span>Created</span> {formatShortDate(stat.project.created)}</span>
              <span><span>Updated</span> {formatShortDate(stat.updated)}</span>
            </span>
            <span className="project-card-stats">
              <span><strong>{stat.workstreams.length}</strong> Workstreams</span>
              <span><strong>{stat.openTasks.length}</strong> Open tasks</span>
              <span><strong>{stat.tasks.length}</strong> Tasks</span>
              <span><strong>{stat.relatedAssets}</strong> Assets</span>
            </span>
          </button>
        ))}
      </div>
    ) : (
      <div className="empty-state">No projects match this filter.</div>
    );

  const renderTaskRows = (items, emptyText, kind) => {
    const pagination = paginateItems(items, currentPage);
    return (
      <>
        {pagination.visible.length > 0 ? (
          <div className="table table-workspace">
            <div className="tr th">
              <div>Task</div>
              <div>Project</div>
              <div>Workstream</div>
              <div>State</div>
            </div>
            {pagination.visible.map((task) => (
              <div className="tr" key={`${task.project.slug}:${task.path}`}>
                <div className="td-primary">
                  <LinkButton onClick={() => onOpenProjectDoc(task.project.slug, task.path)} title={task.title}>
                    {kind === "blocked" && <span className="dot dot-warn" />} {task.title}
                  </LinkButton>
                </div>
                <div>{projectButton(task.project)}</div>
                <div>{workstreamButton(task)}</div>
                <div>
                  <StatusChip>{task.status}</StatusChip>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">{emptyText}</div>
        )}
        {renderPagination(pagination)}
      </>
    );
  };

  const renderProgress = () => {
    const pagination = paginateItems(workspace.progress, currentPage);

    return (
      <>
        {pagination.visible.length > 0 ? (
          <div className="timeline timeline-workspace">
            {pagination.visible.map((doc) => {
              const date = doc.updated
                ? new Date(doc.updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "";
              return (
                <div className="tl-row" key={`${doc.project.slug}:${doc.path}`}>
                  <div className="tl-date mono">{date}</div>
                  <div className="tl-bullet">
                    <span />
                  </div>
                  <div className="tl-body">
                    <div className="workspace-line">
                      <LinkButton onClick={() => onOpenProjectDoc(doc.project.slug, doc.path)} title={doc.title}>
                        {doc.title}
                      </LinkButton>
                      <span className="td-muted-inline">{doc.project.title}</span>
                    </div>
                    <div className="td-muted small">{doc.snippet}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No progress entries across projects.</div>
        )}
        {renderPagination(pagination)}
      </>
    );
  };

  const renderWarnings = () => {
    const pagination = paginateItems(workspace.warnings, currentPage);
    return (
      <>
        {pagination.visible.length > 0 ? (
          <div className="table table-workspace-warnings">
            <div className="tr th">
              <div>Severity</div>
              <div>Project</div>
              <div>Note</div>
              <div>Source</div>
            </div>
            {pagination.visible.map((w, i) => (
              <div className="tr" key={`${w.project.slug}:${w.note}:${i}`}>
                <div>
                  <span className={`chip ${w.sev === "Medium" ? "chip-warn" : "chip-low"}`}>
                    <span className="chip-dot" /> {w.sev}
                  </span>
                </div>
                <div>{projectButton(w.project)}</div>
                <div className="td-primary">{w.note}</div>
                <div className="td-muted">{w.ws}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ color: "var(--ok)" }}>
            No warnings across projects.
          </div>
        )}
        {renderPagination(pagination)}
      </>
    );
  };

  const renderBody = () => {
    if (view === "workspace-projects") return renderProjects();
    if (view === "workspace-current") return renderTaskRows(workspace.current, "No active tasks across projects.");
    if (view === "workspace-blockers") return renderTaskRows(workspace.blockers, "No blockers across projects.", "blocked");
    if (view === "workspace-validation") return renderTaskRows(workspace.validation, "No tasks to validate across projects.");
    if (view === "workspace-progress") return renderProgress();
    if (view === "workspace-warnings") return renderWarnings();
    return null;
  };

  const count =
    view === "workspace-projects" ? filteredProjectStats.length :
    view === "workspace-current" ? workspace.counts.current :
    view === "workspace-blockers" ? workspace.counts.blockers :
    view === "workspace-validation" ? workspace.counts.validation :
    view === "workspace-progress" ? workspace.counts.progress :
    view === "workspace-warnings" ? workspace.counts.warnings :
    null;

  return (
    <div className="page">
      <section className="block">
        <SectionHeader title={title} count={count} right={projectFilterControl} />
        {renderBody()}
      </section>
    </div>
  );
}

/* ================================================================
   Project Outline Pages
   ================================================================ */
function ProjectWorkstreamsPage({ index, project, docs, onOpenWorkstream, onOpenDoc }) {
  const workstreams = project.outline?.workstreams || [];
  const taskDocs = useMemo(() => {
    const byTaskPath = {};
    docs.filter((doc) => doc.role === "task").forEach((task) => {
      byTaskPath[task.path] = task;
    });
    return byTaskPath;
  }, [docs]);

  return (
    <div className="page">
      <h1 className="page-title">Workstreams</h1>
      <section className="block">
        <SectionHeader title="Project outline" count={workstreams.length} />
        {workstreams.length > 0 ? (
          <div className="outline-list">
            {workstreams.map((ws) => {
              const tasks = (ws.tasks || []).map((path) => taskDocs[path]).filter(Boolean);
              return (
                <div className="outline-row" key={ws.path}>
                  <button className="outline-main" onClick={() => onOpenWorkstream(ws.path)} type="button">
                    <span className="outline-title">{ws.title}</span>
                    <StatusChip>{ws.status || "Planned"}</StatusChip>
                  </button>
                  {tasks.length > 0 && (
                    <div className="outline-sublist">
                      {tasks.map((task) => (
                        <button className="outline-subitem" key={task.path} onClick={() => onOpenDoc(task.path)} type="button">
                          <span className="mono">{task.taskId || task.path.split("/").pop()?.replace(/\.md$/, "")}</span>
                    <span title={task.title}>{task.title}</span>
                          <StatusChip>{task.status || "Planned"}</StatusChip>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No workstreams in this project.</div>
        )}
      </section>
    </div>
  );
}

function ProjectTasksPage({ project, docs, onOpenDoc, onOpenWorkstream }) {
  const dashboard = useMemo(() => getDashboardModel(project, docs), [project, docs]);
  const { tasks, wsLookup } = dashboard;

  return (
    <div className="page">
      <h1 className="page-title">Tasks</h1>
      <section className="block">
        <SectionHeader title="Project tasks" count={tasks.length} />
        {tasks.length > 0 ? (
          <div className="table table-4">
            <div className="tr th">
              <div>Task</div>
              <div>Workstream</div>
              <div>Status</div>
              <div>Source</div>
            </div>
            {tasks.map((task) => {
              const ws = wsLookup[task.path];
              return (
                <div className="tr" key={task.path}>
                  <div className="td-primary">
                    <LinkButton onClick={() => onOpenDoc(task.path)} title={task.title}>{task.title}</LinkButton>
                  </div>
                  <div>
                    {ws ? (
                      <LinkButton onClick={() => onOpenWorkstream(ws.path)} title={ws.title}>{ws.title}</LinkButton>
                    ) : (
                      <span className="td-muted">Unassigned</span>
                    )}
                  </div>
                  <div><StatusChip>{task.status || "Planned"}</StatusChip></div>
                  <div className="mono td-muted">{task.path.split("/").pop()}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No tasks in this project.</div>
        )}
      </section>
    </div>
  );
}

/* ================================================================
   Dashboard Pages
   ================================================================ */
function DashboardPage({ project, docs, view, onOpenWorkstream, onOpenDoc }) {
  const dashboard = useMemo(() => getDashboardModel(project, docs), [project, docs]);
  const { tasks, currentWork, blockers, progressDocs, warnings, wsLookup } = dashboard;
  const title = NAV.find((item) => item.id === view)?.label || "Dashboard";

  const renderCurrentWork = () =>
    currentWork.length > 0 ? (
      <div className="table table-4">
        <div className="tr th">
          <div>Task</div>
          <div>Workstream</div>
          <div>Status</div>
          <div>Source</div>
        </div>
        {currentWork.map((task, i) => {
          const ws = wsLookup[task.path];
          return (
            <div className="tr" key={i}>
              <div className="td-primary">
                <LinkButton onClick={() => onOpenDoc(task.path)} title={task.title}>
                  {task.title}
                </LinkButton>
              </div>
              <div>
                {ws ? (
                  <LinkButton onClick={() => onOpenWorkstream(ws.path)} title={ws.title}>
                    {ws.title}
                  </LinkButton>
                ) : (
                  <span className="td-muted">-</span>
                )}
              </div>
              <div>
                <StatusChip>{task.status}</StatusChip>
              </div>
              <div className="mono td-muted">{task.path.split("/").pop()}</div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="empty-state">No active tasks.</div>
    );

  const renderBlockers = () =>
    blockers.length > 0 ? (
      <div className="table table-3">
        <div className="tr th">
          <div>Task</div>
          <div>Workstream</div>
          <div>Details</div>
        </div>
        {blockers.map((task, i) => {
          const ws = wsLookup[task.path];
          return (
            <div className="tr" key={i}>
              <div className="td-primary">
                <LinkButton onClick={() => onOpenDoc(task.path)} title={task.title}>
                  <span className="dot dot-warn" /> {task.title}
                </LinkButton>
              </div>
              <div>
                {ws ? (
                  <LinkButton onClick={() => onOpenWorkstream(ws.path)} title={ws.title}>
                    {ws.title}
                  </LinkButton>
                ) : (
                  <span className="td-muted">-</span>
                )}
              </div>
              <div className="td-muted">{task.snippet || "-"}</div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="empty-state">No blockers.</div>
    );

  const renderValidation = () =>
    tasks.length > 0 ? (
      <div className="table table-3">
        <div className="tr th">
          <div>Task</div>
          <div>Workstream</div>
          <div>State</div>
        </div>
        {tasks.map((task, i) => {
          const ws = wsLookup[task.path];
          const label = statusLabel(task.status);
          const chipClass = label === "Complete" ? "chip-ok" : label === "Blocked" ? "chip-warn" : "chip-low";
          return (
            <div className="tr" key={i}>
              <div className="td-primary">
                <LinkButton onClick={() => onOpenDoc(task.path)} title={task.title}>
                  {task.title}
                </LinkButton>
              </div>
              <div>
                {ws ? (
                  <LinkButton onClick={() => onOpenWorkstream(ws.path)} title={ws.title}>
                    {ws.title}
                  </LinkButton>
                ) : (
                  <span className="td-muted">-</span>
                )}
              </div>
              <div>
                <span className={`chip ${chipClass}`}>
                  <span className="chip-dot" /> {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="empty-state">No tasks to validate.</div>
    );

  const renderProgress = () =>
    progressDocs.length > 0 ? (
      <div className="timeline">
        {progressDocs.map((doc, i) => {
          const date = doc.updated
            ? new Date(doc.updated).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "";
          return (
            <div className="tl-row" key={i}>
              <div className="tl-date mono">{date}</div>
              <div className="tl-bullet">
                <span />
              </div>
              <div className="tl-body">
                <div>
                  <LinkButton onClick={() => onOpenDoc(doc.path)} title={doc.title}>
                    {doc.title}
                  </LinkButton>
                </div>
                <div className="td-muted small">{doc.snippet}</div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="empty-state">No progress entries.</div>
    );

  const renderWarnings = () =>
    warnings.length > 0 ? (
      <div className="table table-3">
        <div className="tr th">
          <div>Severity</div>
          <div>Note</div>
          <div>Source</div>
        </div>
        {warnings.map((w, i) => (
          <div className="tr" key={i}>
            <div>
              <span className={`chip ${w.sev === "Medium" ? "chip-warn" : "chip-low"}`}>
                <span className="chip-dot" /> {w.sev}
              </span>
            </div>
            <div className="td-primary">{w.note}</div>
            <div className="td-muted">{w.ws}</div>
          </div>
        ))}
      </div>
    ) : (
      <div className="empty-state" style={{ color: "var(--ok)" }}>
        No warnings.
      </div>
    );

  const renderBody = () => {
    if (view === "current") return renderCurrentWork();
    if (view === "blockers") return renderBlockers();
    if (view === "validation") return renderValidation();
    if (view === "progress") return renderProgress();
    if (view === "warnings") return renderWarnings();
    return null;
  };

  const count =
    view === "current" ? currentWork.length :
    view === "blockers" ? blockers.length :
    view === "validation" ? tasks.length :
    view === "progress" ? progressDocs.length :
    view === "warnings" ? warnings.length :
    null;

  return (
    <div className="page">
      <h1 className="page-title">{title}</h1>
      <section className="block">
        <SectionHeader title={title} count={count} />
        {renderBody()}
      </section>
    </div>
  );
}

/* ================================================================
   Workstream Detail
   ================================================================ */
function WorkstreamDetail({ index, project, wsPath, onBack, onOpenDoc }) {
  const [wsDoc, setWsDoc] = useState(null);

  useEffect(() => {
    if (!wsPath) return;
    fetch(`/api/doc?path=${encodeURIComponent(wsPath)}`)
      .then((r) => r.json())
      .then(setWsDoc);
  }, [wsPath]);

  const outline = project.outline;
  const wsOutline = outline?.workstreams?.find((w) => w.path === wsPath);
  const tasks = useMemo(
    () => (wsOutline?.tasks || []).map((p) => byPath(index.docs, p)).filter(Boolean),
    [wsOutline, index.docs]
  );

  if (!wsDoc) {
    return (
      <div className="page">
        <div className="empty-state">Loading workstream...</div>
      </div>
    );
  }

  const title = wsDoc.title || wsOutline?.title || "Workstream";
  const status = wsDoc.status || wsOutline?.status;
  const owner = wsDoc.frontmatter?.owner || "";
  const created = wsDoc.frontmatter?.created || "";
  const updated = wsDoc.updated || "";

  // Parse markdown into named sections
  const body = (wsDoc.markdown || "").replace(/^---[\s\S]*?\n---\r?\n/, "");
  const sections = {};
  let currentSection = "__body";
  sections[currentSection] = [];
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (heading) {
      currentSection = heading[1].toLowerCase().replace(/[^a-z0-9]+/g, "-");
      sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line);
    }
  }
  const sectionHtml = (key) => {
    const lines = sections[key];
    if (!lines || !lines.filter((l) => l.trim()).length) return null;
    return parseBlocks(lines);
  };

  const summaryHtml = sectionHtml("summary") || sectionHtml("__body");
  const goalHtml = sectionHtml("goal") || sectionHtml("objective");
  const scopeHtml = sectionHtml("scope");
  const notesHtml = sectionHtml("notes");
  const decisionsHtml = sectionHtml("decisions");

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="page">
      <button className="back" onClick={onBack}>
        <Icon d={I.arrowL} size={14} /> Back to Overview
      </button>
      <div className="ws-eyebrow">Workstream</div>
      <h1 className="page-title">{title}</h1>

      <section className="summary summary-tight">
        <Field label="Status">
          <StatusChip>{status || "Planned"}</StatusChip>
        </Field>
        <Field label="Owner">{owner || "—"}</Field>
        <Field label="Created">{fmtDate(created)}</Field>
        <Field label="Last updated">{fmtDate(updated)}</Field>
      </section>

      <div className="two-col">
        <div className="col-main">
          {summaryHtml && (
            <Block title="Summary">
              <div dangerouslySetInnerHTML={{ __html: summaryHtml }} />
            </Block>
          )}
          {goalHtml && (
            <Block title="Goal">
              <div dangerouslySetInnerHTML={{ __html: goalHtml }} />
            </Block>
          )}
          {scopeHtml && (
            <Block title="Scope">
              <div dangerouslySetInnerHTML={{ __html: scopeHtml }} />
            </Block>
          )}

          <Block title="Tasks">
            <ul className="checklist">
              {tasks.map((t, i) => {
                const done = statusLabel(t.status) === "Complete";
                const taskId = t.taskId || t.path.split("/").pop()?.replace(/\.md$/, "");
                return (
                  <li key={i} className={done ? "done" : ""}>
                    <span className="cb">
                      {done && <Icon d={<path d="M5 12.5l4 4 10-11" />} size={11} />}
                    </span>
                    <LinkButton onClick={() => onOpenDoc(t.path, wsPath)} title={t.title}>
                      {t.title}
                    </LinkButton>
                    <span className="checklist-meta">
                      <StatusChip>{t.status || "Planned"}</StatusChip>
                      <span className="task-id-copy mono">
                        <span>{taskId}</span>
                        <CopyButton value={taskId} label="task ID" />
                      </span>
                    </span>
                  </li>
                );
              })}
              {!tasks.length && (
                <li style={{ color: "var(--ink-50)", listStyle: "none" }}>
                  No tasks linked to this workstream.
                </li>
              )}
            </ul>
          </Block>

          {notesHtml && (
            <Block title="Notes">
              <div dangerouslySetInnerHTML={{ __html: notesHtml }} />
            </Block>
          )}
          {decisionsHtml && (
            <Block title="Decisions">
              <div dangerouslySetInnerHTML={{ __html: decisionsHtml }} />
            </Block>
          )}
        </div>

        <aside className="col-side">
          <div className="side-block">
            <div className="side-head">Details</div>
            <dl className="dl">
              <dt>Status</dt>
              <dd>
                <StatusChip>{status || "Planned"}</StatusChip>
              </dd>
              {owner && (
                <>
                  <dt>Owner</dt>
                  <dd>{owner}</dd>
                </>
              )}
              <dt>
                <span>Source path</span>
                <CopyButton value={wsPath} label="source path" />
              </dt>
              <dd className="mono small">
                <span className="copy-value">{wsPath}</span>
              </dd>
              {wsOutline?.id && (
                <>
                  <dt>
                    <span>ID</span>
                    <CopyButton value={wsOutline.id} label="workstream ID" />
                  </dt>
                  <dd className="mono">
                    <span>{wsOutline.id}</span>
                  </dd>
                </>
              )}
            </dl>
          </div>

          <div className="side-block">
            <div className="side-head">Task summary</div>
            <dl className="dl">
              <dt>Total</dt>
              <dd className="mono">{tasks.length}</dd>
              <dt>Open</dt>
              <dd className="mono">{tasks.filter((task) => statusLabel(task.status) !== "Complete").length}</dd>
              <dt>Complete</dt>
              <dd className="mono">{tasks.filter((task) => statusLabel(task.status) === "Complete").length}</dd>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ================================================================
   Document Reader
   ================================================================ */
function DocumentReader({ doc, project, index, onBack, onOpenAction, onOpenDoc, onOpenWorkstream, onOpenTasks }) {
  if (!doc) {
    return (
      <div className="page">
        <div className="empty-state">Loading document...</div>
      </div>
    );
  }

  const props = Object.entries(doc.frontmatter || {});
  const taskNav = getTaskNavigation(index, project, doc);
  const taskReference = (value) => {
    if (!taskNav) return null;
    return taskNav.tasksById[String(value || "").trim().toUpperCase()] || null;
  };
  const renderMetaValue = (key, value) => {
    const values = listValue(value);

    if (doc.role === "task" && key === "workstream" && taskNav?.parent) {
      return (
        <LinkButton onClick={() => onOpenWorkstream(taskNav.parent.path)} title={taskNav.parent.title}>
          {values.join(", ") || taskNav.parent.id || taskNav.parent.title}
        </LinkButton>
      );
    }

    if (doc.role === "task" && ["depends_on", "conflicts_with"].includes(key) && values.length) {
      return values.map((item, index) => {
        const relatedTask = taskReference(item);
        return (
          <React.Fragment key={`${key}:${item}`}>
            {index > 0 && <span className="meta-separator">,</span>}
            {relatedTask ? (
              <LinkButton onClick={() => onOpenDoc(relatedTask.path, taskNav?.parent?.path || null)} title={relatedTask.title}>
                {item}
              </LinkButton>
            ) : (
              <span>{item}</span>
            )}
          </React.Fragment>
        );
      });
    }

    if (Array.isArray(value)) return value.join(", ");
    return String(value ?? "");
  };
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          month: "short", day: "numeric", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: false,
        })
      : "—";

  return (
    <div className="page doc-reader-page">
      <div className="doc-reader-main">
        {onBack && (
          <button className="back" onClick={onBack}>
            <Icon d={I.arrowL} size={14} /> Back
          </button>
        )}
        <div className="ws-eyebrow">{titleCase(doc.role)}</div>
        <h1 className="page-title">{doc.title}</h1>

        <article
          className="md-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.markdown || "") }}
        />
      </div>

      <aside className="doc-side" aria-label="Document context">
        {doc.role === "task" && taskNav && (
          <div className="side-block task-nav-block">
            <div className="side-head">Task navigation</div>
            <div className="task-parent">
              <div className="side-label">Parent workstream</div>
              {taskNav.parent ? (
                <button className="task-parent-link" type="button" onClick={() => onOpenWorkstream(taskNav.parent.path)}>
                  <span>{taskNav.parent.title}</span>
                  <Icon d={I.chevR} size={13} />
                </button>
              ) : (
                <div className="empty-state">No parent workstream found.</div>
              )}
            </div>
            <div className="task-nav-actions">
              <button className="link-muted" type="button" onClick={onOpenTasks}>All project tasks</button>
            </div>
            <div className="side-label side-label-list">
              Sibling tasks <span className="count">{taskNav.siblings.length}</span>
            </div>
            <ul className="side-list task-sibling-list">
              {taskNav.siblings.map((task) => {
                const isCurrent = task.path === doc.path;
                return (
                  <li key={task.path} className={isCurrent ? "is-current" : ""}>
                    <button
                      className="side-list-button"
                      type="button"
                      onClick={() => onOpenDoc(task.path, taskNav.parent?.path || null)}
                      disabled={isCurrent}
                    >
                      <span className="sl-name">{task.title}</span>
                      <span className="sl-right">
                        <StatusChip>{task.status || "Planned"}</StatusChip>
                        {!isCurrent && <Icon d={I.chevR} size={13} />}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!taskNav.siblings.length && (
                <li className="side-list-empty">No siblings</li>
              )}
            </ul>
          </div>
        )}

        <div className="doc-meta-panel" aria-label="Document metadata">
          <div className="doc-meta-title">Metadata</div>
          <dl className="dl doc-meta-list">
            <dt>
              <span>Path</span>
              <CopyButton value={doc.path} label="source path" />
            </dt>
            <dd className="mono">
              <span className="copy-value">{doc.path}</span>
            </dd>
            {doc.status && (
              <>
                <dt>Status</dt>
                <dd><StatusChip>{doc.status}</StatusChip></dd>
              </>
            )}
            <dt>Updated</dt>
            <dd>{fmtDate(doc.updated)}</dd>
            {props.map(([k, v]) => {
              const copyable = isCopyableMetaKey(k);
              return (
                <React.Fragment key={k}>
                  <dt>
                    <span>{k}</span>
                    {copyable && (
                      <CopyButton value={v} label={copyLabelFromMetaKey(k, doc.role)} />
                    )}
                  </dt>
                  <dd>
                    {renderMetaValue(k, v)}
                  </dd>
                </React.Fragment>
              );
            })}
          </dl>
        </div>
      </aside>
    </div>
  );
}

/* ================================================================
   Document List (for non-project folders like context, templates)
   ================================================================ */
function DocumentList({ index, project, docs, onOpenDoc }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query) return docs;
    const q = query.toLowerCase();
    return docs.filter((d) => {
      const haystack = [d.title, d.path, d.snippet, d.role].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [docs, query]);

  return (
    <div className="page">
      <h1 className="page-title">{project.title}</h1>

      <div style={{ maxWidth: "400px" }}>
        <input
          className="search-input"
          placeholder="Search documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="table table-list">
        <div className="tr th">
          <div>Document</div>
          <div>Role</div>
          <div>Status</div>
          <div>Updated</div>
        </div>
        {filtered.map((doc, i) => (
          <div className="tr" key={i} style={{ cursor: "pointer" }} onClick={() => onOpenDoc(doc.path)}>
            <div>
              <div className="td-primary">{doc.title}</div>
              <div className="mono td-muted" style={{ fontSize: "11px", marginTop: "2px" }}>
                {doc.path}
              </div>
            </div>
            <div className="td-muted">{titleCase(doc.role)}</div>
            <div>
              {doc.status ? <StatusChip>{doc.status}</StatusChip> : <span className="td-muted">—</span>}
            </div>
            <div className="td-muted">
              {doc.updated
                ? new Date(doc.updated).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div style={{ padding: "32px 0", color: "var(--ink-50)", textAlign: "center" }}>
            {query ? "No documents match your search." : "No documents in this folder."}
          </div>
        )}
      </div>

      <div className="page-foot mono">
        viewer · read-only · {docs.length} document{docs.length !== 1 ? "s" : ""} · generated at{" "}
        <span>{index.generatedAt || ""}</span>
      </div>
    </div>
  );
}

/* ================================================================
   App — root component
   ================================================================ */
function App() {
  const [index, setIndex] = useState(null);
  const [projectSlug, setProjectSlug] = useState(null);
  const [route, setRoute] = useState(DEFAULT_WORKSPACE_ROUTE);
  const [section, setSection] = useState(null);
  const [docPath, setDocPath] = useState(null);
  const [doc, setDoc] = useState(null);
  const [wsPath, setWsPath] = useState(null);
  const [workspacePages, setWorkspacePages] = useState({});

  // Load index on mount
  useEffect(() => {
    fetch("/api/index")
      .then((r) => r.json())
      .then((data) => {
        const nav = restoreNavigation(data);
        setIndex(data);
        setProjectSlug(nav.projectSlug);
        setRoute(nav.route);
        setSection(nav.section);
        setDocPath(nav.docPath);
        setWsPath(nav.wsPath);
        setWorkspacePages(nav.workspacePages);
      });
  }, []);

  useEffect(() => {
    if (!index || !projectSlug) return;
    try {
      window.localStorage.setItem(NAV_STATE_KEY, JSON.stringify({
        version: NAV_STATE_VERSION,
        projectSlug,
        route,
        section,
        docPath,
        wsPath,
        workspacePages,
      }));
    } catch (_) {
      /* ignore unavailable storage */
    }
  }, [index, projectSlug, route, section, docPath, wsPath, workspacePages]);

  // Load doc when docPath changes
  useEffect(() => {
    if (!docPath) {
      setDoc(null);
      return;
    }
    setDoc(null);
    fetch(`/api/doc?path=${encodeURIComponent(docPath)}`)
      .then((r) => r.json())
      .then(setDoc);
  }, [docPath]);

  // Scroll to top on route change
  useEffect(() => {
    const main = document.querySelector(".main");
    if (main) main.scrollTo(0, 0);
  }, [route, wsPath, docPath]);

  const handleWorkspacePageChange = useCallback((view, nextPage) => {
    const page = Math.max(1, Math.floor(Number(nextPage) || 1));
    setWorkspacePages((pages) => ({ ...pages, [view]: page }));
  }, []);

  const updateCurrentWorkspacePage = useCallback(
    (nextPage) => handleWorkspacePageChange(route, nextPage),
    [handleWorkspacePageChange, route]
  );

  if (!index) {
    return (
      <div style={{ padding: "48px", color: "var(--ink-50)", fontFamily: "var(--font-sans)" }}>
        Loading Delano viewer...
      </div>
    );
  }

  const { project, docs } = getProjectData(index, projectSlug);
  const hasOutline = project?.outline;

  const handleSelectProject = (slug) => {
    setProjectSlug(slug);
    const p = index.projects.find((pp) => pp.slug === slug);
    const nextRoute = fallbackRouteForProject(p);
    setRoute(nextRoute);
    setSection(nextRoute === "overview" ? "overview" : null);
    setDocPath(null);
    setDoc(null);
    setWsPath(null);
  };

  const handleNavigate = (newRoute, newSection) => {
    if (newRoute === "document" && newSection) {
      setRoute("document");
      setDocPath(newSection);
      setSection(newSection);
    } else {
      setRoute(newRoute);
      setSection(newSection || null);
      setDocPath(null);
      setDoc(null);
    }
    setWsPath(null);
  };

  const handleOpenWorkstream = (path) => {
    setRoute("workstream");
    setWsPath(path);
    setSection(null);
    setDocPath(null);
    setDoc(null);
  };

  const handleOpenDoc = (path, contextWsPath) => {
    setRoute("document");
    setDocPath(path);
    setSection(path);
    if (contextWsPath !== undefined) setWsPath(contextWsPath);
  };

  const handleOpenProject = (slug) => {
    const p = index.projects.find((pp) => pp.slug === slug);
    setProjectSlug(slug);
    const nextRoute = fallbackRouteForProject(p);
    setRoute(nextRoute);
    setSection(nextRoute === "overview" ? "overview" : null);
    setWsPath(null);
    setDocPath(null);
    setDoc(null);
  };

  const handleOpenProjectDoc = (slug, path) => {
    setProjectSlug(slug);
    setRoute("document");
    setDocPath(path);
    setSection(path);
    setWsPath(null);
  };

  const handleOpenProjectWorkstream = (slug, path) => {
    setProjectSlug(slug);
    setRoute("workstream");
    setWsPath(path);
    setSection(null);
    setDocPath(null);
    setDoc(null);
  };

  const handleOpenAction = async (target, path) => {
    try {
      await fetch(`/api/open?target=${encodeURIComponent(target)}&path=${encodeURIComponent(path)}`, {
        method: "POST",
      });
    } catch (_) {
      /* ignore */
    }
  };

  const handleBack = () => {
    if (route === "document" && wsPath) {
      setRoute("workstream");
      setDocPath(null);
      setDoc(null);
      setSection(null);
    } else {
      setRoute(hasOutline ? "overview" : "list");
      setSection(hasOutline ? "overview" : null);
      setWsPath(null);
      setDocPath(null);
      setDoc(null);
    }
  };

  let mainContent;
  if (route === "workstream" && wsPath && hasOutline) {
    mainContent = (
      <WorkstreamDetail
        index={index}
        project={project}
        wsPath={wsPath}
        onBack={handleBack}
        onOpenDoc={handleOpenDoc}
      />
    );
  } else if (route === "document" && docPath) {
    mainContent = (
      <DocumentReader
        doc={doc}
        project={project}
        index={index}
        onBack={handleBack}
        onOpenAction={handleOpenAction}
        onOpenDoc={handleOpenDoc}
        onOpenWorkstream={handleOpenWorkstream}
        onOpenTasks={() => handleNavigate("tasks")}
      />
    );
  } else if (GLOBAL_ROUTES.has(route)) {
    mainContent = (
      <WorkspacePage
        index={index}
        view={route}
        page={workspacePages[route] || 1}
        onPageChange={updateCurrentWorkspacePage}
        onOpenProject={handleOpenProject}
        onOpenProjectDoc={handleOpenProjectDoc}
        onOpenProjectWorkstream={handleOpenProjectWorkstream}
      />
    );
  } else if (route === "workstreams" && hasOutline) {
    mainContent = (
      <ProjectWorkstreamsPage
        index={index}
        project={project}
        docs={docs}
        onOpenWorkstream={handleOpenWorkstream}
        onOpenDoc={handleOpenDoc}
      />
    );
  } else if (route === "tasks" && hasOutline) {
    mainContent = (
      <ProjectTasksPage
        project={project}
        docs={docs}
        onOpenDoc={handleOpenDoc}
        onOpenWorkstream={handleOpenWorkstream}
      />
    );
  } else if (route === "overview" && hasOutline) {
    mainContent = (
      <Overview
        index={index}
        project={project}
        docs={docs}
        scrollTarget={section}
        onOpenWorkstream={handleOpenWorkstream}
        onOpenDoc={handleOpenDoc}
        onOpenTasks={() => handleNavigate("tasks")}
      />
    );
  } else {
    mainContent = (
      <DocumentList index={index} project={project} docs={docs} onOpenDoc={handleOpenDoc} />
    );
  }

  return (
    <div className="app">
      <Sidebar
        index={index}
        projectSlug={projectSlug}
        route={route}
        section={section}
        onNavigate={handleNavigate}
        onSelectProject={handleSelectProject}
      />
      <div className="main">
        <Topbar
          project={project}
          index={index}
          docPath={docPath || (hasOutline ? project.outline.spec : null)}
          onOpenAction={handleOpenAction}
        />

        <div className="content content-reader-head-c">{mainContent}</div>

      </div>
      <div id="copy-live" className="sr-only" aria-live="polite" aria-atomic="true"></div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
