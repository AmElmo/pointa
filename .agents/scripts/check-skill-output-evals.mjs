import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const root = path.join(repoRoot, ".agents", "eval-fixtures", "skill-output");
const errors=[]; let checked=0;
for (const kind of ["valid","invalid"]) for (const dir of listDirs(path.join(root, kind))) { const fixture=JSON.parse(readFileSync(path.join(root, kind, dir, "output.json"), "utf8")); checked++; const valid=Array.isArray(fixture.evidence) && fixture.evidence.length > 0 && fixture.privacy === "metadata-only"; if (kind === "valid" && !valid) errors.push(`${dir} expected valid skill output`); if (kind === "invalid" && valid) errors.push(`${dir} expected invalid skill output`); }
if (checked < 2) errors.push("expected at least one valid and one invalid skill output fixture");
if(errors.length){ console.error("Skill output eval check failed:"); errors.forEach(e=>console.error(`- ${e}`)); process.exit(1); }
console.log(`Skill output eval check passed for ${checked} fixture(s).`);
function listDirs(dir){ if(!existsSync(dir)) return []; return readdirSync(dir,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name); }
function resolveRepoRoot(startDir){ for(const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if(existsSync(path.join(c,".agents"))) return c; return path.resolve(startDir,".."); }
