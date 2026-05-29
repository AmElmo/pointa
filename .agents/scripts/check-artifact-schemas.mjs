import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname);
const scopePath = path.join(repoRoot, ".agents", "schemas", "artifact-scope.json");
const errors = [];

const scope = readJson(scopePath, "artifact scope");
const artifactTypes = scope.artifact_types || {};

for (const [artifactType, contract] of Object.entries(artifactTypes)) {
  const schemaPath = contract.schema_path;
  if (typeof schemaPath !== "string" || schemaPath.trim() === "") {
    errors.push(`${artifactType} must declare schema_path in artifact-scope.json.`);
    continue;
  }

  const absoluteSchemaPath = path.join(repoRoot, schemaPath);
  const schema = readJson(absoluteSchemaPath, `${artifactType} schema`);
  if (!existsSync(absoluteSchemaPath)) {
    continue;
  }

  checkSchemaBasics(artifactType, schemaPath, schema);
  checkRequiredFields(artifactType, contract, schema);
  checkEnumFields(artifactType, contract, schema);
}

if (errors.length > 0) {
  console.error("Artifact schema check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Artifact schema check passed for ${Object.keys(artifactTypes).length} artifact schemas.`);

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Could not read ${label} at ${toRepoPath(filePath)}: ${error.message}`);
    return {};
  }
}

function checkSchemaBasics(artifactType, schemaPath, schema) {
  if (!schema.$schema) {
    errors.push(`${schemaPath} must declare $schema.`);
  }
  if (!schema.$id) {
    errors.push(`${schemaPath} must declare $id.`);
  }
  if (schema.type !== "object") {
    errors.push(`${schemaPath} must describe an object schema.`);
  }
  if (!schema.title || !schema.title.toLowerCase().includes("delano")) {
    errors.push(`${schemaPath} must include a Delano-specific title.`);
  }
  if (artifactType !== path.basename(schemaPath, ".schema.json")) {
    errors.push(`${schemaPath} file name must match artifact type ${artifactType}.`);
  }
}

function checkRequiredFields(artifactType, contract, schema) {
  const expected = contract.required_fields || [];
  const actual = schema.required || [];
  for (const field of expected) {
    if (!actual.includes(field)) {
      errors.push(`${artifactType} schema must require canonical field: ${field}`);
    }
    if (!schema.properties || !schema.properties[field]) {
      errors.push(`${artifactType} schema must define canonical property: ${field}`);
    }
  }
}

function checkEnumFields(artifactType, contract, schema) {
  for (const [field, expectedValues] of Object.entries(contract.enum_fields || {})) {
    const property = schema.properties && schema.properties[field];
    if (!property) {
      errors.push(`${artifactType} schema must define enum property: ${field}`);
      continue;
    }

    const actualValues = property.enum || [];
    for (const value of expectedValues) {
      if (!actualValues.includes(value)) {
        errors.push(`${artifactType}.${field} schema enum missing value: ${value}`);
      }
    }
  }
}

function resolveRepoRoot(startDir) {
  const candidates = [
    path.resolve(startDir, ".."),
    path.resolve(startDir, "..", "..")
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, ".agents", "schemas", "artifact-scope.json"))) {
      return candidate;
    }
  }

  return path.resolve(startDir, "..");
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}
