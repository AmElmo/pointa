/**
 * Syncs the release version across all package files.
 * Called by semantic-release during the prepare step.
 *
 * Usage: node scripts/sync-versions.js <version>
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/sync-versions.js <version>");
  process.exit(1);
}

function updateJsonFile(filePath, updater) {
  const content = JSON.parse(readFileSync(filePath, "utf-8"));
  updater(content);
  writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");
  console.log(`Updated ${filePath} to ${version}`);
}

// Root package.json
updateJsonFile(join(root, "package.json"), (pkg) => {
  pkg.version = version;
});

// annotations-server/package.json
updateJsonFile(join(root, "annotations-server", "package.json"), (pkg) => {
  pkg.version = version;
});

// extension/manifest.json
updateJsonFile(join(root, "extension", "manifest.json"), (manifest) => {
  manifest.version = version;
});
