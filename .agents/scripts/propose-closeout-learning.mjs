import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const project = readOption("--project") || "delano-learning-loop";
const metricsPath = readOption("--metrics") || path.join(repoRoot, ".agents", "metrics", "delivery-events.jsonl");
const metrics = readEvents(metricsPath).filter((event)=>event.project === project || !event.project);
const proposal = {
  schema_version: 1,
  mode: "dry-run-proposal",
  project,
  apply_posture: "proposal-only-no-mutation",
  summary: { event_count: metrics.length, recommendation_count: 1, privacy: "summary-only" },
  recommendations: [{ id: "LP-001", type: "closeout-learning", summary: metrics.length ? "Review summarized delivery metrics during closeout." : "Capture at least one delivery metric event during future closeouts.", evidence: ["scripts/summarize-project-metrics.mjs", ".agents/logs/delivery-metrics.md"] }]
};
if (process.argv.includes("--json")) console.log(JSON.stringify(proposal,null,2)); else console.log(`Closeout learning proposal produced ${proposal.summary.recommendation_count} recommendation(s) for ${project}.`);
function readEvents(filePath){ if(!existsSync(filePath)) return []; return readFileSync(filePath,"utf8").split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line)); }
function readOption(name){ const i=process.argv.indexOf(name); return i===-1?"":process.argv[i+1]; }
function resolveRepoRoot(startDir){ for(const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if(existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
