import { spawnSync } from "node:child_process";
import path from "node:path";

const riskySharedPrefixes = [
  ".agents/scripts/",
  ".claude/scripts/",
  "scripts/",
  "package.json",
  "assets/install-manifest.json",
  "assets/payload/"
];

const status = git(["status", "--porcelain=v1"]);
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
const worktreeList = git(["worktree", "list", "--porcelain"]);
const worktreePrune = git(["worktree", "prune", "--dry-run", "--verbose"]);

const issues = [];
const warnings = [];
if (status.status !== 0) issues.push("git status failed");
const branchName = branch.stdout.trim();
if (branch.status !== 0 || !branchName) issues.push("branch could not be resolved");
else if (branchName === "HEAD") warnings.push("branch is detached");
if (worktreeList.status !== 0) issues.push("git worktree list failed");
if (worktreePrune.status !== 0) warnings.push("git worktree prune dry-run failed");

const dirtyFiles = parseStatus(status.stdout);
const riskySharedFiles = dirtyFiles.filter((file) => riskySharedPrefixes.some((prefix) => file.path === prefix || file.path.startsWith(prefix)));
const worktrees = parseWorktrees(worktreeList.stdout);
const staleWorktrees = parseStaleWorktrees(worktreePrune.stdout);

for (const file of riskySharedFiles) warnings.push(`risky shared file is dirty: ${file.path}`);
for (const stale of staleWorktrees) warnings.push(`stale worktree candidate: ${stale}`);

const result = {
  schema_version: 1,
  branch: branchName || "unknown",
  upstream: upstream.status === 0 ? upstream.stdout.trim() : "",
  dirty: dirtyFiles.length > 0,
  dirty_files: dirtyFiles,
  risky_shared_files: riskySharedFiles,
  worktrees,
  stale_worktrees: staleWorktrees,
  issues,
  warnings
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Worktree health: ${issues.length ? "issues" : "ok"}; dirty=${result.dirty}; branch=${result.branch}; risky=${riskySharedFiles.length}; stale=${staleWorktrees.length}.`);
}
if (issues.length) process.exit(1);

function git(args) {
  return spawnSync("git", args, { encoding: "utf8" });
}
function parseStatus(text) {
  return text.split("\n").filter(Boolean).map((line) => {
    const statusCode = line.slice(0, 2);
    const rawPath = line.slice(3).trim();
    const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
    return { status: statusCode.trim() || "??", path: normalizePath(filePath) };
  });
}
function parseWorktrees(text) {
  const entries = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      if (current) entries.push(current);
      current = null;
      continue;
    }
    const [key, ...rest] = line.split(" ");
    const value = rest.join(" ");
    if (key === "worktree") current = { path: safeWorktreePath(value), branch: "", head: "", bare: false, detached: false };
    else if (!current) continue;
    else if (key === "HEAD") current.head = value;
    else if (key === "branch") current.branch = value.replace(/^refs\/heads\//, "");
    else if (key === "bare") current.bare = true;
    else if (key === "detached") current.detached = true;
  }
  if (current) entries.push(current);
  return entries;
}
function parseStaleWorktrees(text) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => normalizePath(line.replace(/^Removing worktrees\//, "worktrees/")));
}
function safeWorktreePath(value) {
  const absolute = path.resolve(String(value || ""));
  const cwd = path.resolve(process.cwd());
  if (absolute === cwd) return ".";
  if (absolute.startsWith(`${cwd}${path.sep}`)) return normalizePath(path.relative(cwd, absolute));
  return `external:${path.basename(absolute)}`;
}
function normalizePath(value) {
  return String(value || "").replaceAll(path.sep, "/");
}
