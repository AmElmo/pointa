#!/usr/bin/env node
const { existsSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function findDelanoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (
      existsSync(path.join(current, ".project", "projects")) &&
      existsSync(path.join(current, ".agents", "scripts", "pm", "status.sh"))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function toBashPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function resolveBash() {
  const candidates = [];

  if (process.env.DELANO_BASH) {
    candidates.push(process.env.DELANO_BASH);
  }

  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Git\\bin\\bash.exe",
      "C:\\Program Files\\Git\\usr\\bin\\bash.exe"
    );

    const whereResult = spawnSync("where.exe", ["bash"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    if (whereResult.status === 0 && whereResult.stdout) {
      candidates.push(...whereResult.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
    }
  } else {
    const whichResult = spawnSync("which", ["bash"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    if (whichResult.status === 0 && whichResult.stdout.trim()) {
      candidates.push(whichResult.stdout.trim());
    }
    candidates.push("/usr/bin/bash", "/bin/bash");
  }

  return candidates.find((candidate) => candidate && existsSync(candidate)) || null;
}

const root = findDelanoRoot(process.cwd());
const bashPath = resolveBash();
if (!root || !bashPath) {
  process.exit(0);
}

const statusScript = toBashPath(path.join(root, ".agents", "scripts", "pm", "status.sh"));
const result = spawnSync(bashPath, [statusScript, "--open", "--brief"], {
  cwd: root,
  encoding: "utf8",
  timeout: 4500,
  maxBuffer: 64 * 1024
});

if (result.error || result.status !== 0) {
  process.exit(0);
}

const statusOutput = result.stdout.trim();
if (!statusOutput) {
  process.exit(0);
}

const additionalContext = formatStatusContext(statusOutput);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext
  }
}));

function formatStatusContext(rawStatusOutput) {
  const lines = rawStatusOutput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const projectLines = lines.filter((line) => (
    !line.startsWith("Delano ") &&
    !/^=+$/.test(line) &&
    !line.startsWith("No open projects")
  ));

  if (projectLines.length === 0) {
    return "Delano startup context. Open projects: none.";
  }

  const projects = projectLines.map(formatProjectLine);
  return `Delano startup context. Open projects: ${projects.join("; ")}.`;
}

function formatProjectLine(line) {
  const match = line.match(/^(\S+)\s+spec=(\S+)\s+plan=(\S+)\s+open_tasks=(\d+)\s+total_tasks=(\d+)$/);
  if (!match) {
    return line;
  }

  const [, slug, spec, plan, openTasks, totalTasks] = match;
  return `${slug} (spec=${spec}, plan=${plan}, open_tasks=${openTasks}, total_tasks=${totalTasks})`;
}

module.exports = {
  formatProjectLine,
  formatStatusContext
};
