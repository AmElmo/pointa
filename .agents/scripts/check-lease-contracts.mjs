import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const schema = JSON.parse(readFileSync(path.join(repoRoot, ".agents", "schemas", "leases", "lease.schema.json"), "utf8"));
const errors = [];
for (const field of ["schema_version", "lease_id", "owner", "project", "task_id", "status", "mode", "conflict_zones", "acquired_at", "expires_at"]) {
  if (!schema.required?.includes(field)) errors.push(`lease schema must require ${field}`);
}
for (const status of ["active", "released", "expired"]) if (!schema.properties?.status?.enum?.includes(status)) errors.push(`lease status missing ${status}`);
for (const mode of ["shared", "exclusive"]) if (!schema.properties?.mode?.enum?.includes(mode)) errors.push(`lease mode missing ${mode}`);
if (!schema.properties?.handoff_summary) errors.push("lease schema must reserve handoff_summary for release closeout");
if (errors.length) { console.error("Lease contract check failed:"); for (const e of errors) console.error(`- ${e}`); process.exit(1); }
console.log("Lease contract check passed for lifecycle fields and modes.");
function resolveRepoRoot(startDir) { for (const c of [path.resolve(startDir,".."), path.resolve(startDir,"..","..")]) if (existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
