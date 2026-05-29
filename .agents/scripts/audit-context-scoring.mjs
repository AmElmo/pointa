import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const targets = ["AGENTS.md", ".project/context", ".project/registry/linear-map.json", ".agents/scripts/pm/validate.sh"];
const findings = targets.map(scoreTarget);
const summary = { real:0, placeholder:0, stale:0, missing:0, not_applicable:0 };
for (const f of findings) summary[f.classification]++;
const result = { schema_version: 1, score: findings.filter(f=>f.classification === "real").length, max_score: findings.length, summary, findings };
if (process.argv.includes("--json")) console.log(JSON.stringify(result,null,2)); else console.log(`Context audit score ${result.score}/${result.max_score}; missing=${summary.missing}; placeholder=${summary.placeholder}.`);
if (summary.missing || summary.placeholder) process.exit(1);
function scoreTarget(rel){ const abs=path.join(repoRoot, rel); if(!existsSync(abs)) return { path: rel, classification: "missing", reason: "required context path is absent" }; const st=statSync(abs); if(st.isDirectory()) return { path: rel, classification: "real", reason: "directory present" }; const text=readFileSync(abs,"utf8"); if(/TODO|placeholder|coming soon/i.test(text) && text.length < 200) return { path: rel, classification: "placeholder", reason: "short placeholder text" }; if(rel.endsWith('validate.sh') && !text.includes('Summary')) return { path: rel, classification: "stale", reason: "validation script lacks summary section" }; return { path: rel, classification: "real", reason: "required context content present" }; }
function resolveRepoRoot(startDir){ for(const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if(existsSync(path.join(c,".project"))) return c; return path.resolve(startDir,".."); }
