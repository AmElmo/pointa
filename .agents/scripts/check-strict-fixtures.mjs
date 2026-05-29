import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const fixturesRoot = path.join(repoRoot, ".agents", "validation-fixtures", "strict");
const manifestPath = path.join(fixturesRoot, "manifest.json");
const errors = [];

const manifest = readJson(manifestPath, "strict fixture manifest");
const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
const requiredInvalidRules = new Set(["missing-evidence", "broken-dependencies", "stale-context", "path-leak", "invalid-transition"]);

if (manifest.schema_version !== 1) errors.push("strict fixture manifest schema_version must be 1.");
if (!fixtures.some((fixture) => fixture.kind === "valid" && fixture.expected === "pass")) {
  errors.push("strict fixtures must include at least one valid passing project.");
}

for (const rule of requiredInvalidRules) {
  if (!fixtures.some((fixture) => fixture.kind === "invalid" && fixture.expected_rule === rule)) {
    errors.push(`strict fixtures missing invalid fixture for rule: ${rule}`);
  }
}

for (const fixture of fixtures) {
  const fixturePath = path.join(fixturesRoot, fixture.path || "");
  if (!existsSync(fixturePath)) {
    errors.push(`fixture path does not exist: ${fixture.path}`);
    continue;
  }

  const violations = validateFixture(fixturePath);
  if (fixture.kind === "valid" && violations.length > 0) {
    errors.push(`${fixture.name} expected pass but produced violations: ${violations.join(", ")}`);
  }
  if (fixture.kind === "invalid" && !violations.includes(fixture.expected_rule)) {
    errors.push(`${fixture.name} expected rule ${fixture.expected_rule} but produced: ${violations.join(", ") || "none"}`);
  }
}

if (errors.length > 0) {
  console.error("Strict fixture check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Strict fixture check passed for ${fixtures.length} fixtures.`);

function validateFixture(fixturePath) {
  const violations = new Set();
  const markdownFiles = listMarkdownFiles(fixturePath);
  const tasks = new Map();

  for (const file of markdownFiles) {
    const text = readFileSync(file, "utf8");
    if (/PATH_LEAK_TOKEN\(/.test(text) || /\/home\/[^\s)]+/.test(text) || /\/Users\/[^\s)]+/.test(text) || /\/mnt\/[A-Za-z]\/[^\s)]+/.test(text) || /[A-Z]:\\Users\\[^\s)]+/i.test(text)) violations.add("path-leak");
    const frontmatter = parseFrontmatter(text);
    if (frontmatter.id && frontmatter.status) tasks.set(frontmatter.id, { file, text, frontmatter });
    if (frontmatter.review_by && Date.parse(frontmatter.review_by) < Date.parse("2026-04-29T00:00:00Z")) violations.add("stale-context");
  }

  for (const task of tasks.values()) {
    const fm = task.frontmatter;
    const dependencies = parseList(fm.depends_on || "[]");
    if (["ready", "in-progress", "done"].includes(fm.status)) {
      for (const dependencyId of dependencies) {
        const dependency = tasks.get(dependencyId);
        if (dependency && dependency.frontmatter.status !== "done") violations.add("broken-dependencies");
      }
    }
    if (fm.status === "blocked" && (!fm.blocked_owner || !fm.blocked_check_back)) violations.add("invalid-transition");
    if (fm.status === "done") {
      const acceptance = section(task.text, "Acceptance Criteria");
      const evidence = section(task.text, "Evidence Log");
      if (acceptance.includes("- [ ]") || !/^- \d{4}-\d{2}-\d{2}.*(validation passed|Validation:|passed:)/im.test(evidence)) {
        violations.add("missing-evidence");
      }
    }
  }

  return [...violations].sort();
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    result[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return result;
}

function parseList(raw) {
  const value = raw.trim();
  if (!value || value === "[]") return [];
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map((item) => item.trim().replace(/^['\"]|['\"]$/g, "")).filter(Boolean);
  }
  return [value.replace(/^['\"]|['\"]$/g, "")].filter(Boolean);
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

function listMarkdownFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listMarkdownFiles(fullPath));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath);
  }
  return files;
}

function readJson(filePath, label) {
  try { return JSON.parse(readFileSync(filePath, "utf8")); }
  catch (error) { errors.push(`Could not read ${label}: ${error.message}`); return {}; }
}

function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, ".agents")) && existsSync(path.join(candidate, ".project"))) return candidate;
  }
  return path.resolve(startDir, "..");
}
