import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const errors = [];
const schema = readJson(path.join(repoRoot, ".agents", "schemas", "metrics", "delivery-events.schema.json"));
const docs = readText(path.join(repoRoot, ".agents", "logs", "delivery-metrics.md"));

for (const field of ["schema_version", "event_id", "event_type", "timestamp", "project", "actor", "summary"]) {
  if (!schema.required?.includes(field)) errors.push(`delivery metric schema missing required field: ${field}`);
}
const eventTypes = schema.properties?.event_type?.enum || [];
for (const eventType of ["task_status_changed", "validation_run", "lease_acquired", "lease_released", "drift_report_generated", "repair_plan_created", "closeout_recorded"]) {
  if (!eventTypes.includes(eventType)) errors.push(`delivery metric schema missing event type: ${eventType}`);
  if (!docs.includes(eventType)) errors.push(`delivery metrics docs missing event type: ${eventType}`);
}
if (schema.properties?.summary?.properties?.privacy?.const !== "metadata-only") errors.push("delivery metric summaries must be metadata-only.");
const repoPathPattern = schema.properties?.evidence?.properties?.repo_paths?.items?.not?.pattern;
if (repoPathPattern !== "^/") errors.push("delivery metric evidence must reject absolute repo paths.");
for (const forbidden of ["prompt_raw", "prompt_redacted", "transcript", "customer_data"]) {
  if (JSON.stringify(schema).includes(forbidden) || docs.includes(forbidden)) errors.push(`delivery metrics contract mentions forbidden raw field: ${forbidden}`);
}

if (errors.length > 0) {
  console.error("Delivery metric event check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Delivery metric event check passed for ${eventTypes.length} event type(s).`);

function readJson(filePath) {
  if (!existsSync(filePath)) {
    errors.push(`missing file: ${path.relative(repoRoot, filePath)}`);
    return {};
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}
function readText(filePath) {
  if (!existsSync(filePath)) {
    errors.push(`missing file: ${path.relative(repoRoot, filePath)}`);
    return "";
  }
  return readFileSync(filePath, "utf8");
}
function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) if (existsSync(path.join(candidate, ".project")) && existsSync(path.join(candidate, ".agents"))) return candidate;
  return path.resolve(startDir, "..");
}
