import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const modesPath = path.join(repoRoot, ".agents", "schemas", "operating-modes.json");
const rulePath = path.join(repoRoot, ".agents", "rules", "delivery-modes.md");
const errors = [];

const contract = readJson(modesPath, "operating modes contract");
const modes = Array.isArray(contract.modes) ? contract.modes : [];
const expectedModes = [0, 1, 2, 3, 4];
const expectedSlugs = ["patch", "scoped-change", "feature", "uncertain-feature", "multi-stream"];

if (contract.schema_version !== 1) {
  errors.push("operating-modes.json schema_version must be 1.");
}

if (modes.length !== expectedModes.length) {
  errors.push(`operating-modes.json must define ${expectedModes.length} modes.`);
}

const seenModes = new Set();
const seenSlugs = new Set();
for (const [index, expectedMode] of expectedModes.entries()) {
  const mode = modes[index];
  if (!mode) continue;

  if (mode.mode !== expectedMode) {
    errors.push(`mode index ${index} must be mode ${expectedMode}.`);
  }
  if (mode.slug !== expectedSlugs[index]) {
    errors.push(`mode ${expectedMode} must use slug ${expectedSlugs[index]}.`);
  }
  if (seenModes.has(mode.mode)) {
    errors.push(`duplicate operating mode: ${mode.mode}`);
  }
  seenModes.add(mode.mode);
  if (seenSlugs.has(mode.slug)) {
    errors.push(`duplicate operating mode slug: ${mode.slug}`);
  }
  seenSlugs.add(mode.slug);

  for (const field of ["name", "use_when"]) {
    if (typeof mode[field] !== "string" || mode[field].trim() === "") {
      errors.push(`mode ${expectedMode} must define non-empty ${field}.`);
    }
  }
  if (!Array.isArray(mode.requires) || mode.requires.length === 0) {
    errors.push(`mode ${expectedMode} must define at least one requirement.`);
  }
}

const doc = readText(rulePath, "delivery modes rule");
for (const slug of expectedSlugs) {
  if (!doc.includes(slug)) {
    errors.push(`delivery-modes.md must document slug: ${slug}`);
  }
}

if (errors.length > 0) {
  console.error("Operating modes check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Operating modes check passed for modes 0 through 4.");

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Could not read ${label} at ${toRepoPath(filePath)}: ${error.message}`);
    return {};
  }
}

function readText(filePath, label) {
  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    errors.push(`Could not read ${label} at ${toRepoPath(filePath)}: ${error.message}`);
    return "";
  }
}

function resolveRepoRoot(startDir) {
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..")];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, ".agents", "schemas"))) return candidate;
  }
  return path.resolve(startDir, "..");
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}
