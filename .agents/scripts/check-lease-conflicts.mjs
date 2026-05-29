import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const statePath = readOption("--state") || path.join(repoRoot, ".agents", "leases", "active-leases.json");
const requestedZones = readList("--zone");
const requestedMode = readOption("--mode") || "shared";
const state = readState(statePath);
const active = (state.leases || []).filter((lease) => lease.status === "active" && new Date(lease.expires_at).getTime() > Date.now());
const conflicts = [];
for (const lease of active) {
  const overlap = requestedZones.length ? lease.conflict_zones.filter((zone) => requestedZones.includes(zone)) : [];
  if (!requestedZones.length) continue;
  if (overlap.length && (lease.mode === "exclusive" || requestedMode === "exclusive")) conflicts.push({ lease_id: lease.lease_id, owner: lease.owner, zones: overlap, mode: lease.mode });
}
if (process.argv.includes("--json")) console.log(JSON.stringify({ schema_version: 1, conflict_count: conflicts.length, conflicts }, null, 2));
else console.log(`Lease conflict check found ${conflicts.length} conflict(s).`);
if (conflicts.length) process.exit(2);
function readState(filePath) { if (!existsSync(filePath)) return { schema_version: 1, leases: [] }; return JSON.parse(readFileSync(filePath, "utf8")); }
function readOption(name) { const i = process.argv.indexOf(name); return i === -1 ? "" : process.argv[i + 1]; }
function readList(name) { const out=[]; process.argv.forEach((arg,i)=>{ if(arg===name && process.argv[i+1]) out.push(process.argv[i+1]); }); return out; }
function resolveRepoRoot(startDir) { for (const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if (existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
