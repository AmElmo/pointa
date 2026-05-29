import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDriftReport } from "./build-drift-report.mjs";
import { readLocalSyncMap } from "./read-local-sync-map.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const args = new Set(process.argv.slice(2));
const jsonMode = args.has("--json");
const apply = args.has("--apply");
const approve = readOption("--approve");

const report = buildDriftReport(readLocalSyncMap(repoRoot), {}, {}, { localOnlyMode: true });
const plan = buildRepairPlan(report, { apply, approve });

if (jsonMode) console.log(JSON.stringify(plan, null, 2));
else {
  console.log(`Repair plan produced ${plan.summary.action_count} action(s).`);
  console.log(`Apply gate: ${plan.apply_gate.status}.`);
  for (const action of plan.actions) console.log(`- ${action.mode}: ${action.target} ${action.summary}`);
}

if (apply && plan.apply_gate.status !== "approved") {
  if (!jsonMode) console.error(`Refusing apply: ${plan.apply_gate.reason}`);
  process.exit(2);
}

export function buildRepairPlan(report, options = {}) {
  const actions = (report.repair_recommendations || []).map((recommendation) => ({
    id: recommendation.id,
    mode: "dry-run-plan",
    drift_type: recommendation.drift_type,
    target: recommendation.target,
    summary: recommendation.summary,
    proposed_action: recommendation.proposed_action,
    apply_posture: recommendation.apply_posture || "dry-run-plan-first",
    evidence: recommendation.evidence || {}
  }));
  const token = `APPLY-${report.schema_version}-${report.summary.drift_count}-${report.summary.repair_count}`;
  const approved = options.apply && options.approve === token;
  return {
    schema_version: 1,
    mode: options.apply ? "apply-request" : "dry-run-plan",
    source_report: { schema_version: report.schema_version, generated_at: report.generated_at, drift_count: report.summary.drift_count },
    apply_gate: {
      status: approved ? "approved" : "blocked",
      required_token: token,
      provided_token: options.approve || "",
      reason: approved ? "Explicit operator token matched; caller may perform a separate apply step." : "Explicit operator approval token is required before any local or remote mutation."
    },
    summary: { action_count: actions.length, dry_run: !approved, mutation_count: 0 },
    actions
  };
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1];
}
function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) if (existsSync(path.join(candidate, ".project")) && existsSync(path.join(candidate, ".agents"))) return candidate;
  return path.resolve(startDir, "..");
}
