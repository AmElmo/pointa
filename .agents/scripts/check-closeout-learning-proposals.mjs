import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const errors = [];
const schema = readJson(path.join(repoRoot, ".agents", "schemas", "learning", "closeout-learning-proposal.schema.json"));
const skill = readText(path.join(repoRoot, ".agents", "skills", "closeout-skill", "SKILL.md"));
const runbook = readText(path.join(repoRoot, ".agents", "skills", "closeout-skill", "references", "runbook.md"));
const checklist = readText(path.join(repoRoot, ".agents", "skills", "closeout-skill", "templates", "closure-checklist.md"));
const template = readText(path.join(repoRoot, ".agents", "skills", "closeout-skill", "templates", "learning-proposal.md"));
for (const field of ["schema_version", "project", "task_ids", "proposal_type", "title", "rationale", "target_paths", "review_gate", "adoption_status"]) if (!schema.required?.includes(field)) errors.push(`proposal schema missing required field: ${field}`);
for (const type of ["rule", "skill", "schema", "fixture"]) if (!schema.properties?.proposal_type?.enum?.includes(type)) errors.push(`proposal schema missing proposal type: ${type}`);
if (!schema.properties?.review_gate?.enum?.includes("required-before-adoption")) errors.push("proposal schema must require review before adoption");
if (schema.properties?.target_paths?.items?.not?.pattern !== "^/") errors.push("proposal target paths must reject absolute paths");
for (const text of [skill, runbook, checklist, template]) {
  if (!/review/i.test(text) || !/adoption/i.test(text)) errors.push("closeout learning workflow must mention review before adoption in skill assets");
}
if (errors.length) { console.error("Closeout learning proposal check failed:"); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log("Closeout learning proposal workflow check passed.");
function readJson(filePath){ if(!existsSync(filePath)){ errors.push(`missing file: ${path.relative(repoRoot,filePath)}`); return {}; } return JSON.parse(readFileSync(filePath,"utf8")); }
function readText(filePath){ if(!existsSync(filePath)){ errors.push(`missing file: ${path.relative(repoRoot,filePath)}`); return ""; } return readFileSync(filePath,"utf8"); }
function resolveRepoRoot(startDir){ for(const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if(existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
