import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const eventsPath = readOption("--events") || path.join(repoRoot, ".agents", "metrics", "delivery-events.jsonl");
const project = readOption("--project") || "all";
const events = readEvents(eventsPath).filter((e)=>project === "all" || e.project === project);
const byType = Object.create(null);
for (const e of events) byType[e.event_type] = (byType[e.event_type] || 0) + 1;
const summary = { schema_version: 1, project, event_count: events.length, by_type: byType, privacy: "summary-only" };
if (process.argv.includes("--json")) console.log(JSON.stringify(summary, null, 2)); else console.log(`Project metrics summary: ${events.length} event(s), privacy=summary-only.`);
function readEvents(filePath){ if(!existsSync(filePath)) return []; return readFileSync(filePath,"utf8").split(/\r?\n/).filter(Boolean).map((line)=>JSON.parse(line)); }
function readOption(name){ const i=process.argv.indexOf(name); return i===-1?"":process.argv[i+1]; }
function resolveRepoRoot(startDir){ for(const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if(existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
