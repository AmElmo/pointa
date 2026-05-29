import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLocalSyncMap } from "./read-local-sync-map.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const jsonMode = process.argv.includes("--json");
const errors = [];
const report = inspectGithubSync(repoRoot);

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`GitHub sync inspection passed for ${report.projects.length} projects, ${report.summary.issue_refs} issue refs, and ${report.summary.pr_refs} PR refs.`);
  for (const drift of report.drift) console.log(`- ${drift.severity}: ${drift.summary}`);
}

if (errors.length > 0) {
  if (!jsonMode) {
    console.error("GitHub sync inspection failed:");
    for (const error of errors) console.error(`- ${error}`);
  }
  process.exit(1);
}

export function inspectGithubSync(root = repoRoot) {
  const syncMap = readLocalSyncMap(root);
  const fallbackRepo = normalizeGitHubRepo(readGitRemote(root));
  const projects = [];
  const drift = [];
  let issueRefs = 0;
  let prRefs = 0;

  for (const project of syncMap.projects) {
    const githubRepo = normalizeGitHubRepo(project.github_repo) || fallbackRepo || "";
    const inspectedTasks = [];
    for (const task of project.tasks) {
      const issue = normalizeGitHubRef(task.github_issue, githubRepo, "issue");
      const pr = normalizeGitHubRef(task.github_pr, githubRepo, "pull_request");
      if (issue) issueRefs += 1;
      if (pr) prRefs += 1;
      if ((task.github_issue || task.github_pr) && !githubRepo) {
        drift.push({
          drift_type: "mapping-drift",
          severity: "warning",
          target: `${project.slug}/${task.local_id}`,
          summary: "Task has GitHub references but no project github_repo or origin GitHub remote.",
          proposed_action: "Add github_repo to the sync registry or project contract before remote inspection.",
          apply_posture: "dry-run-plan-first"
        });
      }
      inspectedTasks.push({
        local_id: task.local_id,
        status: task.status,
        issue,
        pull_request: pr
      });
    }
    projects.push({ slug: project.slug, github_repo: githubRepo, tasks: inspectedTasks });
  }

  return {
    schema_version: 1,
    mode: "local-dry-run",
    source: "local-task-metadata-and-git-remote",
    summary: { issue_refs: issueRefs, pr_refs: prRefs, drift_count: drift.length },
    projects,
    drift
  };
}

function normalizeGitHubRef(value, fallbackRepo, kind) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const numberMatch = raw.match(/^#?([0-9]+)$/);
  if (numberMatch) return { kind, repo: fallbackRepo || "", number: Number(numberMatch[1]), url: fallbackRepo ? `https://github.com/${fallbackRepo}/${kind === "pull_request" ? "pull" : "issues"}/${numberMatch[1]}` : "" };
  const urlMatch = raw.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/(issues|pull)\/([0-9]+)\/?$/);
  if (urlMatch) return { kind: urlMatch[2] === "pull" ? "pull_request" : "issue", repo: normalizeGitHubRepo(urlMatch[1]), number: Number(urlMatch[3]), url: raw.replace(/\/$/, "") };
  errors.push(`Invalid GitHub ${kind} reference: ${raw}`);
  return null;
}

function normalizeGitHubRepo(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const ssh = raw.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
  if (ssh) return ssh[1].replace(/\.git$/, "");
  const https = raw.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/);
  if (https) return https[1].replace(/\.git$/, "");
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(raw)) return raw.replace(/\.git$/, "");
  return "";
}

function readGitRemote(root) {
  const configPath = path.join(root, ".git", "config");
  if (!existsSync(configPath)) return "";
  const text = readFileSync(configPath, "utf8");
  const match = text.match(/\[remote "origin"\][\s\S]*?url = (.+)/);
  return match ? match[1].trim() : "";
}

function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) if (existsSync(path.join(candidate, ".project")) && existsSync(path.join(candidate, ".agents"))) return candidate;
  return path.resolve(startDir, "..");
}
