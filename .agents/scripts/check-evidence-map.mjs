import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const contractPath = path.join(repoRoot, ".agents", "schemas", "evidence-map.json");
const projectsRoot = path.join(repoRoot, ".project", "projects");
const errors = [];
const warnings = [];

const contract = readJson(contractPath, "evidence map contract");
const strictSince = Date.parse(contract.strict_since || "2026-04-29T00:00:00Z");
const proofRules = Array.isArray(contract.done_task_rules) ? contract.done_task_rules : [];
if (contract.schema_version !== 1) errors.push("evidence-map.json schema_version must be 1.");
for (const requiredRule of ["acceptance-criteria-checked", "evidence-log-present", "validation-proof"]) {
  if (!proofRules.some((rule) => rule.id === requiredRule)) errors.push(`evidence map contract missing rule: ${requiredRule}`);
}

for (const taskFile of listTaskFiles(projectsRoot)) {
  const text = readFileSync(taskFile, "utf8");
  const frontmatter = parseFrontmatter(taskFile, text);
  if (frontmatter.status !== "done") continue;

  const strict = isStrictTask(frontmatter, strictSince);
  const taskErrors = validateDoneTask(taskFile, text, proofRules);
  if (strict) errors.push(...taskErrors);
  else warnings.push(...taskErrors);
}

if (errors.length > 0) {
  console.error("Evidence map check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(`Evidence map check warnings: ${warnings.length} legacy evidence warning(s).`);
}
console.log("Evidence map check passed for done task acceptance criteria.");

function validateDoneTask(taskFile, text, proofRules) {
  const localErrors = [];
  const acceptanceSection = section(text, "Acceptance Criteria");
  const evidenceSection = section(text, "Evidence Log");
  const evidenceText = evidenceSection || "";
  const fullEvidenceContext = `${evidenceText}\n${text}`;
  const criteria = acceptanceSection.split("\n").filter((line) => /^- \[[ xX]\]/.test(line.trim()));

  for (const criterion of criteria) {
    if (!/^- \[[xX]\]/.test(criterion.trim())) {
      localErrors.push(`${toRepoPath(taskFile)} is done but has unchecked acceptance criterion: ${criterion.trim()}`);
    }
  }

  const implementationEvidence = evidenceSection
    .split("\n")
    .filter((line) => /^- \d{4}-\d{2}-\d{2}/.test(line.trim()) && !line.toLowerCase().includes("implementation evidence pending"));
  if (implementationEvidence.length === 0) {
    localErrors.push(`${toRepoPath(taskFile)} is done but lacks implementation evidence in Evidence Log.`);
  }

  for (const rule of proofRules) {
    if (!rule.acceptance_criterion_contains) continue;
    const matchingCriterion = criteria.find((criterion) => criterion.toLowerCase().includes(rule.acceptance_criterion_contains.toLowerCase()));
    if (!matchingCriterion) continue;
    const proofTerms = Array.isArray(rule.proof_terms) ? rule.proof_terms : [];
    if (proofTerms.length === 0) continue;
    const hasProof = proofTerms.some((term) => fullEvidenceContext.toLowerCase().includes(term.toLowerCase()));
    if (!hasProof) {
      localErrors.push(`${toRepoPath(taskFile)} criterion lacks mapped evidence proof for rule ${rule.id}: ${matchingCriterion.trim()}`);
    }
  }

  return localErrors;
}

function isStrictTask(frontmatter, strictSince) {
  const updated = Date.parse(frontmatter.updated || "");
  if (!Number.isNaN(updated) && updated >= strictSince) return true;
  const created = Date.parse(frontmatter.created || "");
  return !Number.isNaN(created) && created >= strictSince;
}

function section(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function parseFrontmatter(filePath, text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) { errors.push(`${toRepoPath(filePath)} is missing frontmatter.`); return {}; }
  const result = {};
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    result[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return result;
}

function listTaskFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const project of readdirSync(root, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    const tasksDir = path.join(root, project.name, "tasks");
    if (!existsSync(tasksDir)) continue;
    for (const task of readdirSync(tasksDir, { withFileTypes: true })) {
      if (task.isFile() && task.name.endsWith(".md")) files.push(path.join(tasksDir, task.name));
    }
  }
  return files;
}

function readJson(filePath, label) {
  try { return JSON.parse(readFileSync(filePath, "utf8")); }
  catch (error) { errors.push(`Could not read ${label} at ${toRepoPath(filePath)}: ${error.message}`); return {}; }
}

function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, ".project", "projects")) && existsSync(path.join(candidate, ".agents"))) return candidate;
  }
  return path.resolve(startDir, "..");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}
