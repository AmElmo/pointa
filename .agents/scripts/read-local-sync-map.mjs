import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);

export function readLocalSyncMap(root = repoRoot) {
  const projectsRoot = path.join(root, ".project", "projects");
  const registryPath = path.join(root, ".project", "registry", "linear-map.json");
  const registry = readOptionalJson(registryPath) || { projects: {}, tasks: {} };
  const projects = [];

  for (const projectDir of listProjectDirs(projectsRoot)) {
    const slug = path.basename(projectDir);
    const projectRegistry = registry.projects?.[slug] || {};
    const tasks = [];
    const tasksDir = path.join(projectDir, "tasks");
    if (existsSync(tasksDir)) {
      for (const taskFile of readdirSync(tasksDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => path.join(tasksDir, entry.name)).sort()) {
        const text = readFileSync(taskFile, "utf8");
        const fm = parseFrontmatter(text);
        const registryKey = `${slug}/${fm.id || path.basename(taskFile, ".md")}`;
        const taskRegistry = registry.tasks?.[registryKey] || registry.tasks?.[fm.id] || {};
        tasks.push({
          local_id: fm.id || path.basename(taskFile, ".md"),
          name: fm.name || titleFromMarkdown(text) || path.basename(taskFile, ".md"),
          status: fm.status || "unknown",
          workstream: fm.workstream || "",
          local_path: toRepoPath(root, taskFile),
          depends_on: parseList(fm.depends_on || "[]"),
          linear_issue_id: emptyToUndefined(fm.linear_issue_id) || taskRegistry.linear_issue_id,
          github_issue: emptyToUndefined(fm.github_issue) || taskRegistry.github_issue,
          github_pr: emptyToUndefined(fm.github_pr) || taskRegistry.github_pr
        });
      }
    }
    projects.push({
      slug,
      local_path: toRepoPath(root, projectDir),
      linear_project_id: projectRegistry.linear_project_id,
      github_repo: projectRegistry.github_repo,
      tasks
    });
  }

  return { schema_version: 1, source: "local", projects };
}

export function validateLocalSyncMap(syncMap) {
  const errors = [];
  const seenProjects = new Set();
  for (const project of syncMap.projects || []) {
    if (seenProjects.has(project.slug)) errors.push(`duplicate project slug: ${project.slug}`);
    seenProjects.add(project.slug);
    if (!/^\.project\/projects\/[^/]+$/.test(project.local_path || "")) errors.push(`invalid project local_path for ${project.slug}: ${project.local_path}`);
    const seenTasks = new Set();
    for (const task of project.tasks || []) {
      if (!/^T-[0-9]{3}$/.test(task.local_id || "")) errors.push(`${project.slug} has invalid task id: ${task.local_id}`);
      if (seenTasks.has(task.local_id)) errors.push(`${project.slug} has duplicate task id: ${task.local_id}`);
      seenTasks.add(task.local_id);
      for (const dependency of task.depends_on || []) {
        if (!seenTasks.has(dependency) && !(project.tasks || []).some((candidate) => candidate.local_id === dependency)) {
          errors.push(`${project.slug}/${task.local_id} depends on missing local task ${dependency}`);
        }
      }
      if (task.github_issue && !isUrlOrNumber(task.github_issue)) errors.push(`${project.slug}/${task.local_id} has invalid github_issue: ${task.github_issue}`);
      if (task.github_pr && !isUrlOrNumber(task.github_pr)) errors.push(`${project.slug}/${task.local_id} has invalid github_pr: ${task.github_pr}`);
    }
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const syncMap = readLocalSyncMap(repoRoot);
  const errors = validateLocalSyncMap(syncMap);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(syncMap, null, 2));
  }
  if (errors.length > 0) {
    console.error("Local sync map validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  if (!process.argv.includes("--json")) {
    const taskCount = syncMap.projects.reduce((sum, project) => sum + project.tasks.length, 0);
    console.log(`Local sync map check passed for ${syncMap.projects.length} project(s) and ${taskCount} task(s).`);
  }
}

function listProjectDirs(projectsRoot) {
  if (!existsSync(projectsRoot)) return [];
  return readdirSync(projectsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(projectsRoot, entry.name)).sort();
}
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    result[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return result;
}
function parseList(raw) {
  const value = String(raw || "").trim();
  if (!value || value === "[]") return [];
  if (value.startsWith("[") && value.endsWith("]")) return value.slice(1, -1).split(",").map((item) => item.trim().replace(/^['\"]|['\"]$/g, "")).filter(Boolean);
  return [value.replace(/^['\"]|['\"]$/g, "")].filter(Boolean);
}
function titleFromMarkdown(text) {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/^Task:\s*/, "").trim() : "";
}
function emptyToUndefined(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : undefined;
}
function isUrlOrNumber(value) {
  return /^https?:\/\//.test(value) || /^#?[0-9]+$/.test(value);
}
function readOptionalJson(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
}
function toRepoPath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}
function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) if (existsSync(path.join(candidate, ".project")) && existsSync(path.join(candidate, ".agents"))) return candidate;
  return path.resolve(startDir, "..");
}
