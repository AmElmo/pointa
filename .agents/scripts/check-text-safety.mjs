import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const bidiControls = new Map([
  [0x200E, "LEFT-TO-RIGHT MARK"],
  [0x200F, "RIGHT-TO-LEFT MARK"],
  [0x202A, "LEFT-TO-RIGHT EMBEDDING"],
  [0x202B, "RIGHT-TO-LEFT EMBEDDING"],
  [0x202C, "POP DIRECTIONAL FORMATTING"],
  [0x202D, "LEFT-TO-RIGHT OVERRIDE"],
  [0x202E, "RIGHT-TO-LEFT OVERRIDE"],
  [0x2066, "LEFT-TO-RIGHT ISOLATE"],
  [0x2067, "RIGHT-TO-LEFT ISOLATE"],
  [0x2068, "FIRST STRONG ISOLATE"],
  [0x2069, "POP DIRECTIONAL ISOLATE"]
]);

const binaryExtensions = new Set([
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".tgz",
  ".ttf",
  ".webp",
  ".woff",
  ".woff2",
  ".zip"
]);

const args = process.argv.slice(2);
const files = resolveFiles(args);
const findings = [];

for (const file of files) {
  const absolutePath = path.resolve(repoRoot, file);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    continue;
  }

  if (binaryExtensions.has(path.extname(absolutePath).toLowerCase())) {
    continue;
  }

  const buffer = readFileSync(absolutePath);
  if (isProbablyBinary(buffer)) {
    continue;
  }

  inspectText(absolutePath, buffer.toString("utf8"));
}

if (findings.length > 0) {
  console.error("Text safety check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line}:${finding.column} contains ${finding.code} (${finding.name})`);
  }
  process.exit(1);
}

console.log(`Text safety check passed for ${files.length} tracked file(s).`);

function resolveFiles(rawArgs) {
  if (rawArgs.length === 0) {
    return gitTrackedFiles();
  }

  const selectedFiles = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--file") {
      const value = rawArgs[index + 1];
      if (!value) {
        throw new Error("--file requires a path");
      }
      selectedFiles.push(value);
      index += 1;
    } else {
      selectedFiles.push(arg);
    }
  }

  return selectedFiles;
}

function gitTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "buffer"
  });

  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function isProbablyBinary(buffer) {
  const sampleLength = Math.min(buffer.length, 8000);
  for (let index = 0; index < sampleLength; index += 1) {
    if (buffer[index] === 0) {
      return true;
    }
  }
  return false;
}

function inspectText(absolutePath, text) {
  for (let index = 0; index < text.length; index += 1) {
    const codePoint = text.codePointAt(index);
    if (!bidiControls.has(codePoint)) {
      continue;
    }

    const position = locate(text, index);
    findings.push({
      file: displayPath(absolutePath),
      line: position.line,
      column: position.column,
      code: `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
      name: bidiControls.get(codePoint)
    });
  }
}

function locate(text, index) {
  let line = 1;
  let lineStart = 0;

  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text[cursor] === "\n") {
      line += 1;
      lineStart = cursor + 1;
    }
  }

  return {
    line,
    column: index - lineStart + 1
  };
}

function displayPath(absolutePath) {
  const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, "/");
  if (!path.isAbsolute(relativePath) && !relativePath.startsWith("..") && relativePath !== "") {
    return relativePath;
  }
  return path.basename(absolutePath);
}
