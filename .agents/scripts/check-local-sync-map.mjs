import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const errors = [];
const warnings = [];
const jsonMode = process.argv.includes("--json");

const syncMap = buildLocalSyncMap(repoRoot);
validateSyncMap(syncMap);

if (jsonMode) {
  console.log(JSON.stringify({ sync_map: syncMap, errors, warnings }, null, 2));
} else if (errors.length === 0) {
  const taskCount = syncMap.projects.reduce((sum, project) => sum + project.tasks.length, 0);
  console.log(`Local sync map check passed for ${syncMap.projects.length} projects and ${taskCount} tasks.`);
  if (warnings.length > 0) for (const warning of warnings) console.warn(`Warning: ${warning}`);
}

if (errors.length > 0) {
  if (!jsonMode) {
    console.error("Local sync map check failed:");
    for (const error of errors) console.error(`- ${error}`);
  }
  process.exit(1);
}

function buildLocalSyncMap(root) {
  const projectsRoot = path.join(root, ".project", "projects");
  const linearMap = readJson(path.join(root, ".project", "registry", "linear-map.json"), "linear map", { projects: {}, tasks: {} });
  const projects = [];

  if (!existsSync(projectsRoot)) {
    errors.push("Missing .project/projects directory.");
    return { schema_version: 1, source: "local-project-contracts", projects };
  }

  for (const entry of readdirSync(projectsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const projectDir = path.join(projectsRoot, entry.name);
    const spec = parseFrontmatter(readText(path.join(projectDir, "spec.md")));
    const plan = parseFrontmatter(readText(path.join(projectDir, "plan.md")));
    const projectSlug = spec.slug || entry.name;
    const registryProject = linearMap.projects?.[projectSlug] || {};
    const project = {
      slug: projectSlug,
      local_path: `.project/projects/${entry.name}`,
      linear_project_id: firstNonEmpty(plan.linear_project_id, spec.linear_project_id, registryProject.linear_project_id, registryProject.id),
      github_repo: firstNonEmpty(plan.github_repo, spec.github_repo, registryProject.github_repo),
      tasks: []
    };

    const tasksDir = path.join(projectDir, "tasks");
    if (existsSync(tasksDir)) {
      for (const taskEntry of readdirSync(tasksDir, { withFileTypes: true })) {
        if (!taskEntry.isFile() || !taskEntry.name.endsWith(".md")) continue;
        const taskPath = path.join(tasksDir, taskEntry.name);
        const fm = parseFrontmatter(readText(taskPath));
        if (!fm.id) {
          warnings.push(`${project.local_path}/tasks/${taskEntry.name} has no task id and was skipped.`);
          continue;
        }
        const registryTask = linearMap.tasks?.[`${projectSlug}:${fm.id}`] || linearMap.tasks?.[fm.id] || {};
        project.tasks.push({
          local_id: fm.id,
          local_path: `${project.local_path}/tasks/${taskEntry.name}`,
          status: fm.status || "unknown",
          linear_issue_id: firstNonEmpty(fm.linear_issue_id, registryTask.linear_issue_id, registryTask.id),
          github_issue: firstNonEmpty(fm.github_issue, registryTask.github_issue),
          github_pr: firstNonEmpty(fm.github_pr, registryTask.github_pr),
          depends_on: parseList(fm.depends_on || "[]")
        });
      }
    }
    project.tasks.sort((a, b) => a.local_id.localeCompare(b.local_id));
    projects.push(project);
  }

  projects.sort((a, b) => a.slug.localeCompare(b.slug));
  return { schema_version: 1, source: "local-project-contracts", projects };
}

function validateSyncMap(syncMap) {
  if (syncMap.schema_version !== 1) errors.push("local sync map schema_version must be 1.");
  if (!Array.isArray(syncMap.projects)) errors.push("local sync map projects must be an array.");
  const seenProjects = new Set();
  for (const project of syncMap.projects || []) {
    if (!project.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) errors.push(`invalid project slug: ${project.slug || "<missing>"}`);
    if (seenProjects.has(project.slug)) errors.push(`duplicate project slug: ${project.slug}`);
    seenProjects.add(project.slug);
    if (!project.local_path || !/^\.project\/projects\/[^/]+$/.test(project.local_path)) errors.push(`invalid local project path for ${project.slug}`);
    const seenTasks = new Set();
    for (const task of project.tasks || []) {
      const taskKey = `${project.slug}:${task.local_id}`;
      if (!/^T-[0-9]{3}$/.test(task.local_id || "")) errors.push(`invalid task id in ${project.slug}: ${task.local_id || "<missing>"}`);
      if (seenTasks.has(task.local_id)) errors.push(`duplicate task id in ${project.slug}: ${task.local_id}`);
      seenTasks.add(task.local_id);
      if (!task.local_path?.startsWith(`${project.local_path}/tasks/`)) errors.push(`invalid task path for ${taskKey}`);
      if (!Array.isArray(task.depends_on)) errors.push(`depends_on must be normalized as an array for ${taskKey}`);
    }
  }
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
  const value = String(raw).trim();
  if (!value || value === "[]") return [];
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map((item) => item.trim().replace(/^[\"']|[\"']$/g, "")).filter(Boolean);
  }
  return [value.replace(/^[\"']|[\"']$/g, "")].filter(Boolean);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function readText(filePath) {
  try { return readFileSync(filePath, "utf8"); }
  catch { return ""; }
}

function readJson(filePath, label, fallback) {
  try { return JSON.parse(readFileSync(filePath, "utf8")); }
  catch (error) { warnings.push(`Could not read ${label}: ${error.message}`); return fallback; }
}

function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, ".agents")) && existsSync(path.join(candidate, ".project"))) return candidate;
  }
  return path.resolve(startDir, "..");
}
