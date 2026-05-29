import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLocalSyncMap } from "./read-local-sync-map.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const jsonMode = process.argv.includes("--json");
const localOnlyMode = process.argv.includes("--local-only") || (!process.argv.includes("--github-snapshot") && !process.argv.includes("--linear-snapshot"));
const githubSnapshotPath = readOption("--github-snapshot") || path.join(repoRoot, ".agents", "fixtures", "github", "status-snapshot.json");
const linearSnapshotPath = readOption("--linear-snapshot") || path.join(repoRoot, ".agents", "fixtures", "linear", "issue-snapshot.json");

if (isDirectRun()) {
  const syncMap = readLocalSyncMap(repoRoot);
  const githubSnapshot = localOnlyMode ? { repositories: [] } : readJson(githubSnapshotPath, { repositories: [] });
  const linearSnapshot = localOnlyMode ? { issues: [] } : readJson(linearSnapshotPath, { issues: [] });
  const report = buildDriftReport(syncMap, githubSnapshot, linearSnapshot, { localOnlyMode });

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Dry-run drift report produced ${report.summary.drift_count} drift item(s) from ${report.summary.tasks} task(s).`);
    console.log(`Mode: ${report.mode}; apply posture: ${report.apply_posture}.`);
    for (const drift of report.drift) console.log(`- ${drift.severity}: ${drift.target} ${drift.summary}`);
  }
}
export function buildDriftReport(syncMap, githubSnapshot = {}, linearSnapshot = {}, options = {}) {
  const githubIndex = indexGithubSnapshot(githubSnapshot);
  const linearIndex = new Map((linearSnapshot.issues || []).map((issue) => [String(issue.id), issue]));
  const drift = [];
  let taskCount = 0;
  let inspectedRefs = 0;

  for (const project of syncMap.projects || []) {
    for (const task of project.tasks || []) {
      taskCount += 1;
      const taskKey = `${project.slug}/${task.local_id}`;

      for (const [field, expectedKind] of [["github_issue", "issue"], ["github_pr", "pull_request"]]) {
        if (!task[field]) continue;
        inspectedRefs += 1;
        const parsed = parseGitHubRef(task[field], project.github_repo, expectedKind);
        if (!parsed) {
          drift.push(driftItem("mapping-drift", "error", taskKey, `invalid ${field}: ${task[field]}`, "Correct or remove the malformed GitHub reference.", { field, value: task[field] }));
          continue;
        }
        const remote = githubIndex.get(`${parsed.owner}/${parsed.repo}#${parsed.number}:${parsed.kind}`);
        if (!remote) {
          drift.push(driftItem("orphan-drift", "warning", taskKey, `${field} has no inspected GitHub counterpart`, "Review the reference or refresh the GitHub snapshot before applying changes.", { field, ref: task[field], expected_kind: expectedKind }));
        } else if (remote.kind && remote.kind !== expectedKind) {
          drift.push(driftItem("mapping-drift", "error", taskKey, `${field} points to ${remote.kind}, expected ${expectedKind}`, "Move the reference to the correct local field or repair the remote mapping.", { field, ref: task[field], external_kind: remote.kind }));
        }
      }

      if (task.linear_issue_id) {
        inspectedRefs += 1;
        const issue = linearIndex.get(String(task.linear_issue_id));
        if (!issue) {
          drift.push(driftItem("orphan-drift", "warning", taskKey, "linear_issue_id has no inspected Linear counterpart", "Review the reference or refresh the Linear snapshot before applying changes.", { linear_issue_id: task.linear_issue_id }));
        } else if (issue.project_id && project.linear_project_id && issue.project_id !== project.linear_project_id) {
          drift.push(driftItem("mapping-drift", "error", taskKey, `Linear project mismatch: ${issue.project_id} != ${project.linear_project_id}`, "Plan a project mapping repair before sync apply.", { linear_issue_id: task.linear_issue_id, external_project_id: issue.project_id, local_project_id: project.linear_project_id }));
        }
      }
    }
  }

  const repairRecommendations = drift.map((item, index) => ({
    id: `RR-${String(index + 1).padStart(3, "0")}`,
    drift_type: item.drift_type,
    target: item.target,
    summary: item.summary,
    proposed_action: item.proposed_action,
    apply_posture: item.apply_posture,
    evidence: item.evidence
  }));

  return {
    schema_version: 1,
    mode: "dry-run",
    generated_at: new Date().toISOString(),
    source: options.localOnlyMode ? "local-sync-map-only" : "local-sync-map-and-fixtures",
    apply_posture: "never-apply-without-explicit-approval",
    summary: {
      projects: (syncMap.projects || []).length,
      tasks: taskCount,
      inspected_refs: inspectedRefs,
      drift_count: drift.length,
      repair_count: repairRecommendations.length
    },
    drift,
    repair_recommendations: repairRecommendations
  };
}

function driftItem(driftType, severity, target, summary, proposedAction, evidence) {
  return { drift_type: driftType, severity, target, summary, proposed_action: proposedAction, apply_posture: "dry-run-plan-first", evidence };
}
function parseGitHubRef(value, fallbackRepo, expectedKind) {
  const raw = String(value || "").trim();
  const url = raw.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(issues|pull)\/([0-9]+)\/?$/);
  if (url) return { owner: url[1], repo: url[2], kind: url[3] === "pull" ? "pull_request" : "issue", number: Number(url[4]) };
  const short = raw.match(/^#?([0-9]+)$/);
  if (short && fallbackRepo?.includes("/")) {
    const [owner, repo] = fallbackRepo.split("/");
    return { owner, repo, kind: expectedKind, number: Number(short[1]) };
  }
  return null;
}
function indexGithubSnapshot(snapshot) {
  const index = new Map();
  for (const repo of snapshot.repositories || []) {
    for (const issue of repo.issues || []) index.set(`${repo.owner}/${repo.name}#${issue.number}:issue`, { ...issue, kind: "issue" });
    for (const pr of repo.pull_requests || []) index.set(`${repo.owner}/${repo.name}#${pr.number}:pull_request`, { ...pr, kind: "pull_request" });
  }
  return index;
}
function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1];
}
function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}
function isDirectRun() {
  return process.argv[1] && path.resolve(process.argv[1]) === __filename;
}
function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) if (existsSync(path.join(candidate, ".project")) && existsSync(path.join(candidate, ".agents"))) return candidate;
  return path.resolve(startDir, "..");
}
