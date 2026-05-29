import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const projectSlug = readOption("--project") || "delano-multi-agent-execution";
const stream = readOption("--stream") || "default";
const tasksDir = path.join(repoRoot, ".project", "projects", projectSlug, "tasks");
const leases = readLeases(readOption("--leases") || path.join(repoRoot, ".agents", "leases", "active-leases.json"));
const taskFiles = existsSync(tasksDir) ? readdirSync(tasksDir).filter((file)=>file.endsWith(".md")) : [];
const ready = taskFiles.map((file)=>readTask(path.join(tasksDir,file))).filter((task)=>task.status === "ready");
const activeZones = new Set(leases.filter((l)=>l.status === "active" && new Date(l.expires_at).getTime() > Date.now()).flatMap((l)=>l.conflict_zones || []));
const candidates = ready.map((task)=>({ ...task, stream, blocked_by_active_zone: task.conflicts_with.some((zone)=>activeZones.has(zone)) })).filter((task)=>!task.blocked_by_active_zone);
const selected = candidates[0] || null;
const result = { schema_version: 1, project: projectSlug, stream, ready_count: ready.length, candidate_count: candidates.length, selected: selected && { id: selected.id, file: selected.file, priority: selected.priority } };
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2)); else console.log(selected ? `Selected ${selected.id} for ${stream}.` : `No unleased ready task for ${stream}.`);
export function readTask(filePath) { const text=readFileSync(filePath,"utf8"); return { file:path.basename(filePath), id: front(text,"id"), status: front(text,"status"), priority: front(text,"priority"), conflicts_with: list(front(text,"conflicts_with")) }; }
function front(text,key){ const m=text.match(new RegExp(`^${key}:\\s*(.*)$`,"m")); return m?m[1].trim():""; }
function list(v){ const m=v.match(/^\[(.*)\]$/); return m?m[1].split(",").map(x=>x.trim()).filter(Boolean):[]; }
function readLeases(filePath){ if(!existsSync(filePath)) return []; return JSON.parse(readFileSync(filePath,"utf8")).leases || []; }
function readOption(name){ const i=process.argv.indexOf(name); return i===-1?"":process.argv[i+1]; }
function resolveRepoRoot(startDir){ for(const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if(existsSync(path.join(c,".project"))) return c; return path.resolve(startDir,".."); }
