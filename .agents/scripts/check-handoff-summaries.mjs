import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const statePath = readOption("--state") || path.join(repoRoot, ".agents", "leases", "active-leases.json");
const leaseManagerScript = resolveScript("lease-manager.mjs");
const selfTest = process.argv.includes("--self-test") || !existsSync(statePath);
const errors = [];

if (selfTest) runSelfTest();
else validateState(statePath);

if (process.argv.includes("--json")) console.log(JSON.stringify({ schema_version: 1, ok: errors.length === 0, error_count: errors.length, errors }, null, 2));
else console.log(`Handoff summary check ${errors.length ? "failed" : "passed"} with ${errors.length} error(s).`);

if (errors.length) {
  if (!process.argv.includes("--json")) for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

function validateState(filePath) {
  const state = JSON.parse(readFileSync(filePath, "utf8"));
  for (const lease of state.leases || []) {
    if (lease.status !== "released") continue;
    validateSummary(lease.handoff_summary || "", `${lease.project}/${lease.task_id}`);
  }
}

function runSelfTest() {
  const dir = path.join(os.tmpdir(), `delano-handoff-${process.pid}`);
  const state = path.join(dir, "leases.json");
  mkdirSync(dir, { recursive: true });
  try {
    const acquire = spawnSync(process.execPath, [leaseManagerScript, "acquire", "--state", state, "--owner", "handoff-test", "--project", "delano-multi-agent-execution", "--task", "T-006", "--zone", ".agents/scripts/lease-manager.mjs"], { cwd: repoRoot, encoding: "utf8" });
    if (acquire.status !== 0) { errors.push(`self-test acquire failed: ${acquire.stderr || acquire.stdout}`); return; }
    const lease = JSON.parse(readFileSync(state, "utf8")).leases[0];
    const missing = spawnSync(process.execPath, [leaseManagerScript, "release", "--state", state, "--lease-id", lease.lease_id], { cwd: repoRoot, encoding: "utf8" });
    if (missing.status === 0) errors.push("release without --handoff should be rejected for active stream closeout");
    const summary = "Changed: validated handoff requirement\nEvidence: self-test release gate\nBlockers: none\nLease state: released\nNext safe action: continue";
    const release = spawnSync(process.execPath, [leaseManagerScript, "release", "--state", state, "--lease-id", lease.lease_id, "--handoff", summary], { cwd: repoRoot, encoding: "utf8" });
    if (release.status !== 0) errors.push(`self-test release with handoff failed: ${release.stderr || release.stdout}`);
    validateState(state);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function validateSummary(summary, target) {
  const required = ["Changed:", "Evidence:", "Blockers:", "Lease state:", "Next safe action:"];
  for (const heading of required) if (!summary.includes(heading)) errors.push(`${target} handoff_summary missing ${heading}`);
}
function resolveScript(name) {
  const canonical = path.join(repoRoot, ".agents", "scripts", name);
  if (existsSync(canonical)) return canonical;
  return path.join(repoRoot, "scripts", name);
}
function readOption(name) { const i = process.argv.indexOf(name); return i === -1 ? "" : process.argv[i + 1]; }
function resolveRepoRoot(startDir) { for (const c of [path.resolve(startDir,".."), path.resolve(startDir,"..","..")]) if (existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
