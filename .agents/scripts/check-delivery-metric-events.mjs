import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const schemaPath = path.join(repoRoot, ".agents", "schemas", "metrics", "delivery-event.schema.json");
const errors = [];
const schema = readJson(schemaPath);

const requiredFields = ["schema_version", "event_id", "event_type", "project", "created_at", "source", "privacy", "summary"];
const eventTypes = ["task-status-change", "validation-run", "sync-drift", "evidence-gap", "blocked-time", "closeout-learning"];
for (const field of requiredFields) if (!schema.required?.includes(field)) errors.push(`delivery metric event schema must require ${field}`);
for (const eventType of eventTypes) if (!schema.properties?.event_type?.enum?.includes(eventType)) errors.push(`delivery metric event type missing ${eventType}`);
if (schema.properties?.privacy?.properties?.raw_text_allowed?.const !== false) errors.push("delivery metric events must disallow raw text by default");
if (schema.properties?.privacy?.properties?.summary_only?.const !== true) errors.push("delivery metric events must be summary-only");
if (!schema.properties?.summary?.minLength) errors.push("delivery metric events must include a non-empty privacy-safe summary");

if (errors.length) {
  console.error("Delivery metric event contract check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Delivery metric event schema check passed for ${eventTypes.length} event type(s).`);
console.log(`Delivery metric event contract check passed for ${eventTypes.length} event type(s).`);

function readJson(filePath) {
  if (!existsSync(filePath)) {
    errors.push(`missing file: ${path.relative(repoRoot, filePath)}`);
    return {};
  }
  return JSON.parse(readFileSync(filePath, "utf8"));
}
function resolveRepoRoot(startDir) { for (const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if (existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
