import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const errors = [];
const warnings = [];
const snapshotPath = path.join(repoRoot, ".agents", "fixtures", "linear", "issue-snapshot.json");
const syncMap = readLocalSyncMap();
const snapshot = readJson(snapshotPath, "Linear issue snapshot", { issues: [] });
const issueIndex = new Map((snapshot.issues || []).map((issue) => [issue.id, issue]));

if (snapshot.schema_version !== 1) errors.push("Linear issue snapshot schema_version must be 1.");

for (const project of syncMap.projects || []) {
  for (const task of project.tasks || []) {
    if (!task.linear_issue_id) continue;
    if (!/^[-_A-Za-z0-9]+$/.test(task.linear_issue_id)) {
      errors.push(`${project.slug}/${task.local_id} has invalid linear_issue_id: ${task.linear_issue_id}`);
      continue;
    }
    const issue = issueIndex.get(task.linear_issue_id);
    if (!issue) {
      warnings.push(`${project.slug}/${task.local_id} Linear issue ${task.linear_issue_id} has no mock snapshot; treated as local-only.`);
      continue;
    }
    if (!issue.state) errors.push(`${task.linear_issue_id} snapshot lacks state.`);
    if (issue.project_id && project.linear_project_id && issue.project_id !== project.linear_project_id) errors.push(`${project.slug}/${task.local_id} Linear project drift: ${issue.project_id} != ${project.linear_project_id}`);
    for (const dependency of issue.depends_on || []) {
      if (!task.depends_on?.includes(dependency.local_id || dependency)) warnings.push(`${project.slug}/${task.local_id} remote dependency not present locally: ${dependency.local_id || dependency}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Linear issue inspection failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Linear issue inspection passed with ${warnings.length} local-only warning(s).`);
if (process.argv.includes("--verbose")) for (const warning of warnings) console.warn(`Warning: ${warning}`);

function readLocalSyncMap() {
  const result = spawnSync(process.execPath, [resolveScript("check-local-sync-map.mjs"), "--json"], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    errors.push(`local sync map reader failed: ${result.stderr || result.stdout}`);
    return { projects: [] };
  }
  const parsed = JSON.parse(result.stdout);
  return parsed.sync_map || parsed;
}
function resolveScript(name) {
  const canonical = path.join(repoRoot, ".agents", "scripts", name);
  if (existsSync(canonical)) return canonical;
  return path.join(repoRoot, "scripts", name);
}
function readJson(filePath, label, fallback) {
  try { return JSON.parse(readFileSync(filePath, "utf8")); }
  catch (error) { errors.push(`Could not read ${label}: ${error.message}`); return fallback; }
}
function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) if (existsSync(path.join(candidate, ".project")) && existsSync(path.join(candidate, ".agents"))) return candidate;
  return path.resolve(startDir, "..");
}
