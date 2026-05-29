import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readLocalSyncMap } from "./read-local-sync-map.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const args = new Set(process.argv.slice(2));
const jsonMode = args.has("--json");
const allowNetwork = args.has("--fetch");
const syncMapPath = readOption("--sync-map");
const statePath = readOption("--github-state") || readOption("--fixture");

const syncMap = syncMapPath ? readJson(syncMapPath) : readLocalSyncMap(repoRoot);
const githubState = statePath ? readJson(statePath) : (allowNetwork ? fetchGithubState(syncMap) : { repositories: {}, source: "none" });
const report = inspectGithubSync(syncMap, githubState, { fetched: allowNetwork && !statePath });

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`GitHub sync inspection checked ${report.summary.checked_refs} refs; ${report.summary.drift_count} drift item(s).`);
  if (!allowNetwork && !statePath) console.log("No GitHub state supplied; use --github-state <file> for deterministic dry-run inspection or --fetch to query gh.");
  for (const drift of report.drift) console.log(`- ${drift.severity}: ${drift.task} ${drift.summary}`);
}

if (report.errors.length > 0) {
  if (!jsonMode) {
    console.error("GitHub sync inspection failed:");
    for (const error of report.errors) console.error(`- ${error}`);
  }
  process.exit(1);
}

export function inspectGithubSync(syncMap, githubState = {}, options = {}) {
  const errors = [];
  const inspections = [];
  const drift = [];
  for (const project of syncMap.projects || []) {
    const repo = project.github_repo || githubState.default_repository || "";
    for (const task of project.tasks || []) {
      for (const field of ["github_issue", "github_pr"]) {
        const localRef = task[field];
        if (!localRef) continue;
        const type = field === "github_pr" ? "pull_request" : "issue";
        const parsed = parseGithubRef(localRef, repo, type);
        const taskKey = `${project.slug}:${task.local_id}`;
        if (!parsed) {
          errors.push(`${taskKey} has unsupported ${field}: ${localRef}`);
          continue;
        }
        const external = lookupGithubState(githubState, parsed);
        const inspection = {
          task: taskKey,
          field,
          local_ref: localRef,
          repository: parsed.repository,
          number: parsed.number,
          type,
          external_state: external?.state || "unknown",
          external_url: external?.url || parsed.url || "",
          source: external?.source || githubState.source || (options.fetched ? "gh" : "fixture-or-none")
        };
        inspections.push(inspection);
        if (!external) {
          drift.push({
            drift_type: "orphan-drift",
            severity: "warning",
            task: taskKey,
            target: `${parsed.repository}#${parsed.number}`,
            summary: `references ${field} without inspected GitHub state`,
            evidence: { local_ref: localRef }
          });
        } else if (external.kind && external.kind !== type) {
          drift.push({
            drift_type: "mapping-drift",
            severity: "error",
            task: taskKey,
            target: `${parsed.repository}#${parsed.number}`,
            summary: `local ${field} points at inspected ${external.kind}`,
            evidence: { local_ref: localRef, external_kind: external.kind }
          });
        }
      }
    }
  }
  return {
    schema_version: 1,
    source: githubState.source || (options.fetched ? "gh" : "local-dry-run"),
    summary: { checked_refs: inspections.length, drift_count: drift.length },
    inspections,
    drift,
    errors
  };
}

function parseGithubRef(ref, projectRepo, type) {
  const value = String(ref || "").trim();
  if (!value) return null;
  const urlMatch = value.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/(issues|pull)\/(\d+)/);
  if (urlMatch) return { repository: urlMatch[1], number: urlMatch[3], url: value };
  const shorthand = value.match(/^([^/\s]+\/[^#\s]+)#(\d+)$/);
  if (shorthand) return { repository: shorthand[1], number: shorthand[2] };
  const number = value.match(/^#?(\d+)$/);
  if (number && projectRepo) return { repository: projectRepo, number: number[1] };
  return null;
}

function lookupGithubState(state, parsed) {
  const repo = state.repositories?.[parsed.repository] || state.repos?.[parsed.repository];
  if (!repo) return null;
  const pr = repo.pull_requests?.[parsed.number] || repo.prs?.[parsed.number];
  if (pr) return { ...pr, kind: "pull_request", source: state.source || "fixture" };
  const issue = repo.issues?.[parsed.number];
  if (issue) return { ...issue, kind: "issue", source: state.source || "fixture" };
  return null;
}

function fetchGithubState(syncMap) {
  const repositories = {};
  if (!commandExists("gh")) return { repositories, source: "gh-unavailable" };
  for (const project of syncMap.projects || []) {
    const repo = project.github_repo;
    if (!repo) continue;
    repositories[repo] ||= { issues: {}, pull_requests: {} };
    for (const task of project.tasks || []) {
      const refs = [task.github_issue, task.github_pr].filter(Boolean);
      for (const ref of refs) {
        const parsed = parseGithubRef(ref, repo);
        if (!parsed) continue;
        const result = spawnSync("gh", ["issue", "view", parsed.number, "--repo", parsed.repository, "--json", "number,state,url"], { encoding: "utf8" });
        if (result.status === 0) {
          const issue = JSON.parse(result.stdout);
          repositories[parsed.repository] ||= { issues: {}, pull_requests: {} };
          repositories[parsed.repository].issues[String(issue.number)] = { state: issue.state, url: issue.url };
        }
      }
    }
  }
  return { repositories, source: "gh" };
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1];
}
function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}
function commandExists(name) {
  const result = spawnSync(process.platform === "win32" ? "where" : "command", process.platform === "win32" ? [name] : ["-v", name], { shell: process.platform !== "win32", stdio: "ignore" });
  return result.status === 0;
}
function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) if (existsSync(path.join(candidate, ".project")) && existsSync(path.join(candidate, ".agents"))) return candidate;
  return path.resolve(startDir, "..");
}
