import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const contextDir = readOption("--context") || path.join(repoRoot, ".project", "context");
const requiredFiles = [
  "project-overview.md",
  "project-brief.md",
  "tech-context.md",
  "project-structure.md",
  "system-patterns.md",
  "product-context.md",
  "project-style-guide.md",
  "progress.md",
  "gui-testing.md"
];
const commandFiles = new Map([
  ["project-style-guide.md", ["bash .agents/scripts/pm/validate.sh"]],
  ["tech-context.md", ["validate.sh"]]
]);
const results = requiredFiles.map(auditFile);
const summary = results.reduce((acc, item) => {
  acc[item.classification] = (acc[item.classification] || 0) + 1;
  return acc;
}, {});
const blocking = results.filter((item) => ["missing", "placeholder", "missing_required_commands"].includes(item.classification));
const report = { schema_version: 1, context_dir: path.relative(repoRoot, contextDir) || ".", file_count: results.length, summary, results, blocking_count: blocking.length };

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else console.log(`Context audit scored ${results.length} file(s): ${Object.entries(summary).map(([k,v])=>`${k}=${v}`).join(", ")}.`);
if (blocking.length) process.exit(1);

function auditFile(file) {
  const filePath = path.join(contextDir, file);
  if (!existsSync(filePath)) return { file, classification: "missing", score: 0, reasons: ["required context file is absent"] };
  const text = readFileSync(filePath, "utf8");
  const reasons = [];
  if (isPlaceholder(text)) return { file, classification: "placeholder", score: 10, reasons: ["contains placeholder language or too little repo-specific content"] };
  const requiredCommands = commandFiles.get(file) || [];
  const missingCommands = requiredCommands.filter((command) => !text.includes(command));
  if (missingCommands.length) return { file, classification: "missing_required_commands", score: 50, reasons: missingCommands.map((command)=>`missing command reference: ${command}`) };
  if (file === "gui-testing.md") return { file, classification: "not_applicable", score: 100, reasons: ["advisory-only GUI policy file"] };
  if (isStale(text)) reasons.push("frontmatter updated date is older than the current delivery cycle");
  return { file, classification: reasons.length ? "stale" : "real", score: reasons.length ? 70 : 100, reasons };
}
function isPlaceholder(text) {
  const compact = text.replace(/---[\s\S]*?---/, "").trim();
  if (compact.length < 80) return true;
  if (/TODO|TBD/i.test(compact)) return true;
  const repoSpecific = /Delano|\.agents|\.project|HANDBOOK|npm|CLI|runtime/i.test(compact);
  return !repoSpecific && /Capture architecture|Document major repository boundaries/i.test(compact);
}
function isStale(text) {
  const match = text.match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m);
  return Boolean(match && match[1] < "2026-04-29");
}
function readOption(name) { const i = process.argv.indexOf(name); return i === -1 ? "" : process.argv[i + 1]; }
function resolveRepoRoot(startDir) { for (const c of [path.resolve(startDir,".."),path.resolve(startDir,"..","..")]) if (existsSync(path.join(c,".project"))) return c; return path.resolve(startDir,".."); }
