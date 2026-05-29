import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const command = process.argv[2] || "self-test";
const statePath = readOption("--state") || path.join(repoRoot, ".agents", "leases", "active-leases.json");

try {
  const result = run(command, statePath);
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else console.log(result.message);
} catch (error) {
  console.error(error.message);
  process.exit(error.exitCode || 1);
}

export function run(command, statePath) {
  if (command === "self-test") return selfTest();
  if (command === "list" || command === "inspect") return { message: `Lease inspection found ${readState(statePath).leases.length} lease(s).`, leases: readState(statePath).leases };
  if (command === "acquire") return acquire(statePath, readRequired("--owner"), readRequired("--project"), readRequired("--task"), readList("--zone"), readOption("--mode") || "shared", Number(readOption("--ttl-minutes") || 120));
  if (command === "release") return release(statePath, readRequired("--lease-id"), readOption("--reason") || "released by owner", readOption("--handoff") || "");
  throw Object.assign(new Error(`Unknown lease command: ${command}`), { exitCode: 1 });
}

function acquire(statePath, owner, project, taskId, zones, mode, ttlMinutes) {
  if (!zones.length) throw Object.assign(new Error("At least one --zone is required."), { exitCode: 1 });
  if (!["shared", "exclusive"].includes(mode)) throw Object.assign(new Error("--mode must be shared or exclusive."), { exitCode: 1 });
  const state = readState(statePath);
  const now = new Date();
  const lease = {
    schema_version: 1,
    lease_id: `lease-${now.toISOString().replace(/[:.]/g, "-")}-${taskId.toLowerCase()}`,
    owner,
    project,
    task_id: taskId,
    status: "active",
    mode,
    paths: zones,
    conflict_zones: zones,
    created_at: now.toISOString(),
    acquired_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttlMinutes * 60_000).toISOString()
  };
  state.leases.push(lease);
  writeState(statePath, state);
  return { message: `Acquired ${lease.lease_id} for ${project}/${taskId}.`, lease };
}

function release(statePath, leaseId, reason, handoff) {
  const state = readState(statePath);
  const lease = state.leases.find((item) => item.lease_id === leaseId);
  if (!lease) throw Object.assign(new Error(`Lease not found: ${leaseId}`), { exitCode: 1 });
  if (!handoff.trim()) {
    throw Object.assign(new Error("--handoff is required and must summarize changed work, evidence, blockers, lease state, and next safe action."), { exitCode: 1 });
  }
  lease.status = "released";
  lease.released_at = new Date().toISOString();
  lease.release_reason = reason;
  lease.handoff_summary = handoff.trim();
  writeState(statePath, state);
  return { message: `Released ${leaseId} with handoff summary.`, lease };
}

function selfTest() {
  const dir = path.join(os.tmpdir(), `delano-lease-${process.pid}`);
  const state = path.join(dir, "leases.json");
  mkdirSync(dir, { recursive: true });
  const acquired = acquire(state, "self-test", "delano-multi-agent-execution", "T-002", ["scripts/lease-manager.mjs"], "exclusive", 5).lease;
  const inspected = readState(state).leases.length;
  release(state, acquired.lease_id, "self-test complete", "validated acquire inspect release lifecycle");
  const released = readState(state).leases[0].status;
  rmSync(dir, { recursive: true, force: true });
  return { message: `Lease manager self-test passed (${inspected} acquired, ${released}).` };
}

function readState(filePath) {
  if (!existsSync(filePath)) return { schema_version: 1, leases: [] };
  return JSON.parse(readFileSync(filePath, "utf8"));
}
function writeState(filePath, state) { mkdirSync(path.dirname(filePath), { recursive: true }); writeFileSync(filePath, JSON.stringify(state, null, 2) + "\n"); }
function readOption(name) { const i = process.argv.indexOf(name); return i === -1 ? "" : process.argv[i + 1]; }
function readRequired(name) { const v = readOption(name); if (!v) throw Object.assign(new Error(`${name} is required.`), { exitCode: 1 }); return v; }
function readList(name) { const out=[]; process.argv.forEach((arg,i)=>{ if(arg===name && process.argv[i+1]) out.push(process.argv[i+1]); }); return out; }
function resolveRepoRoot(startDir) { for (const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if (existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
