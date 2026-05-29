import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const contextDir = path.join(repoRoot, ".project", "context");
const staleDays = Number(readOption("--stale-days") || 180);
const now = Date.now();
const requiredCommandDocs = new Map([
  ["tech-context.md", ["npm test", "validate.sh"]],
  ["progress.md", ["validate.sh"]]
]);

const files = existsSync(contextDir) ? readdirSync(contextDir).filter((file) => file.endsWith(".md")).sort() : [];
const entries = files.map((file) => auditFile(file));
const summary = entries.reduce((acc, entry) => {
  acc[entry.classification] = (acc[entry.classification] || 0) + 1;
  return acc;
}, {});
const result = {
  schema_version: 1,
  context_dir: ".project/context",
  stale_days: staleDays,
  file_count: entries.length,
  summary,
  files: entries
};

if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else console.log(`Context audit scored ${entries.length} file(s): ${Object.entries(summary).map(([k,v])=>`${k}=${v}`).join(", ")}.`);

function auditFile(file) {
  const repoPath = [".project", "context", file].join("/");
  const abs = path.join(repoRoot, ".project", "context", file);
  const text = readFileSync(abs, "utf8");
  const requiredCommands = requiredCommandDocs.get(file) || [];
  const missingCommands = requiredCommands.filter((command) => !text.includes(command));
  const ageDays = Math.floor((now - statSync(abs).mtimeMs) / 86_400_000);
  const lineCount = text.split(/\r?\n/).length;
  const wordCount = (text.match(/\b\w+\b/g) || []).length;
  const placeholderSignals = countSignals(text, [/\bTODO\b/i, /\bTBD\b/i, /placeholder/i, /fill this/i, /coming soon/i]);
  let classification = "real";
  if (file === "README.md") classification = "not_applicable";
  else if (wordCount < 40 || placeholderSignals >= 2) classification = "placeholder";
  else if (missingCommands.length) classification = "missing_required_commands";
  else if (ageDays > staleDays) classification = "stale";
  const score = classification === "real" ? 100 : classification === "stale" ? 65 : classification === "missing_required_commands" ? 55 : classification === "placeholder" ? 25 : 0;
  return { path: repoPath, classification, score, age_days: ageDays, line_count: lineCount, word_count: wordCount, missing_required_commands: missingCommands };
}
function countSignals(text, patterns) { return patterns.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0); }
function readOption(name) { const i = process.argv.indexOf(name); return i === -1 ? "" : process.argv[i + 1]; }
function resolveRepoRoot(startDir) { for (const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if (existsSync(path.join(c,".project"))) return c; return path.resolve(startDir,".."); }
