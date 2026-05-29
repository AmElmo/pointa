import { cp, mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "extension");
const outputDir = path.join(root, "dist", "firefox");
const manifestPath = path.join(sourceDir, "manifest.json");
const structuredCloneSafeCompletion = "\n;void 0;\n";

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await cp(sourceDir, outputDir, {
  recursive: true,
  filter(source) {
    const relative = path.relative(sourceDir, source).replaceAll(path.sep, "/");
    return relative !== "manifest.json" && !relative.startsWith("dist/");
  }
});

const chromeManifest = JSON.parse(await readFile(manifestPath, "utf8"));
const firefoxManifest = buildFirefoxManifest(chromeManifest);

await writeFile(
  path.join(outputDir, "manifest.json"),
  JSON.stringify(firefoxManifest, null, 2) + "\n"
);

await makeInjectedScriptsStructuredCloneSafe(outputDir);

console.log(`Built Firefox extension at ${path.relative(root, outputDir)}`);

function buildFirefoxManifest(manifest) {
  const firefoxManifest = structuredClone(manifest);

  delete firefoxManifest.privacy_policy;

  firefoxManifest.permissions = (manifest.permissions || []).filter(
    (permission) => !["debugger", "tabs"].includes(permission)
  );

  firefoxManifest.host_permissions = Array.from(new Set([
    ...(manifest.host_permissions || []),
    "<all_urls>"
  ]));

  firefoxManifest.background = {
    scripts: [manifest.background?.service_worker || "background/background.js"]
  };

  firefoxManifest.browser_specific_settings = {
    gecko: {
      id: "pointa@pointa.dev",
      strict_min_version: "142.0",
      data_collection_permissions: {
        required: ["websiteActivity", "websiteContent"],
        optional: []
      }
    }
  };

  return firefoxManifest;
}

async function makeInjectedScriptsStructuredCloneSafe(extensionRoot) {
  const scriptRoots = [
    path.join(extensionRoot, "common"),
    path.join(extensionRoot, "content")
  ];

  for (const scriptRoot of scriptRoots) {
    await appendSafeCompletionToJavaScriptFiles(scriptRoot);
  }
}

async function appendSafeCompletionToJavaScriptFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await appendSafeCompletionToJavaScriptFiles(entryPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    const source = await readFile(entryPath, "utf8");
    if (!source.endsWith(structuredCloneSafeCompletion)) {
      await writeFile(entryPath, `${source}${structuredCloneSafeCompletion}`);
    }
  }
}
