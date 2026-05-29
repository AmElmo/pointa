import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const errors = [];
const warnings = [];
const snapshotPath = path.join(repoRoot, ".agents", "fixtures", "github", "status-snapshot.json");
const syncMap = readLocalSyncMap();
const snapshot = readJson(snapshotPath, "GitHub status snapshot", { repositories: [] });
const snapshotIndex = indexSnapshot(snapshot);

if (snapshot.schema_version !== 1) errors.push("GitHub status snapshot schema_version must be 1.");

for (const project of syncMap.projects || []) {
  for (const task of project.tasks || []) {
    inspectRef(project, task, "github_issue", "issue");
    inspectRef(project, task, "github_pr", "pull_request");
  }
}

if (errors.length > 0) {
  console.error("GitHub status inspection failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`GitHub status inspection passed with ${warnings.length} local-only warning(s).`);
if (process.argv.includes("--verbose")) for (const warning of warnings) console.warn(`Warning: ${warning}`);

function inspectRef(project, task, field, kind) {
  const value = task[field];
  if (!value) return;
  const parsed = parseGitHubRef(value, project.github_repo);
  if (!parsed) {
    errors.push(`${project.slug}/${task.local_id} has invalid ${field}: ${value}`);
    return;
  }
  if (parsed.kind !== kind) errors.push(`${project.slug}/${task.local_id} expected ${kind} but got ${parsed.kind}: ${value}`);
  const key = `${parsed.owner}/${parsed.repo}#${parsed.number}:${parsed.kind}`;
  const remote = snapshotIndex.get(key);
  if (!remote) {
    warnings.push(`${project.slug}/${task.local_id} ${field} ${key} has no mock snapshot; treated as local-only.`);
    return;
  }
  if (!remote.state) errors.push(`${project.slug}/${task.local_id} ${field} ${key} snapshot lacks state.`);
  if (kind === "pull_request" && remote.mergeable === "unknown") warnings.push(`${project.slug}/${task.local_id} PR ${key} has unknown mergeability.`);
}

function parseGitHubRef(value, fallbackRepo) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const url = raw.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(issues|pull)\/([0-9]+)$/);
  if (url) return { owner: url[1], repo: url[2], kind: url[3] === "pull" ? "pull_request" : "issue", number: Number(url[4]) };
  const short = raw.match(/^#?([0-9]+)$/);
  if (short && fallbackRepo && fallbackRepo.includes("/")) {
    const [owner, repo] = fallbackRepo.split("/");
    return { owner, repo, kind: "issue", number: Number(short[1]) };
  }
  return null;
}

function indexSnapshot(snapshot) {
  const index = new Map();
  for (const repo of snapshot.repositories || []) {
    const owner = repo.owner;
    const name = repo.name;
    for (const issue of repo.issues || []) index.set(`${owner}/${name}#${issue.number}:issue`, issue);
    for (const pr of repo.pull_requests || []) index.set(`${owner}/${name}#${pr.number}:pull_request`, pr);
  }
  return index;
}

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
