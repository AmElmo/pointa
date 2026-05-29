import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const errors = [];
const taxonomyPath = path.join(repoRoot, ".agents", "schemas", "sync", "drift-taxonomy.json");
const syncMapSchemaPath = path.join(repoRoot, ".agents", "schemas", "sync", "sync-map.schema.json");
const taxonomy = readJson(taxonomyPath, "drift taxonomy");
const syncMapSchema = readJson(syncMapSchemaPath, "sync map schema");

const requiredDrifts = ["mapping-drift", "status-drift", "dependency-drift", "orphan-drift", "repair-recommendation"];
if (taxonomy.schema_version !== 1) errors.push("drift taxonomy schema_version must be 1.");
const driftTypes = Array.isArray(taxonomy.drift_types) ? taxonomy.drift_types : [];
for (const id of requiredDrifts) {
  const drift = driftTypes.find((entry) => entry.id === id);
  if (!drift) {
    errors.push(`drift taxonomy missing type: ${id}`);
    continue;
  }
  if (!drift.description || !Array.isArray(drift.severity) || drift.severity.length === 0 || !drift.repair_posture) {
    errors.push(`drift type ${id} must define description, severity, and repair_posture.`);
  }
}

if (syncMapSchema.type !== "object") errors.push("sync map schema must be an object schema.");
for (const field of ["schema_version", "projects"]) {
  if (!syncMapSchema.required?.includes(field)) errors.push(`sync map schema must require ${field}.`);
}
const projectProperties = syncMapSchema.properties?.projects?.items?.properties || {};
for (const field of ["slug", "local_path", "linear_project_id", "github_repo", "tasks"]) {
  if (!projectProperties[field]) errors.push(`sync map project schema missing ${field}.`);
}

if (errors.length > 0) {
  console.error("Sync schema check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Sync schema check passed for drift taxonomy and sync map schema.");

function readJson(filePath, label) {
  try { return JSON.parse(readFileSync(filePath, "utf8")); }
  catch (error) { errors.push(`Could not read ${label}: ${error.message}`); return {}; }
}
function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) if (existsSync(path.join(candidate, ".agents"))) return candidate;
  return path.resolve(startDir, "..");
}
