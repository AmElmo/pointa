import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Commands that indicate Node.js runtime
const NODE_COMMANDS = ['node', 'npm', 'npx', 'yarn', 'pnpm', 'bun', 'tsx', 'ts-node'];

// Framework detection patterns with default ports
const FRAMEWORK_PATTERNS = {
  'next': { name: 'Next.js', defaultPort: '3000' },
  'nuxt': { name: 'Nuxt', defaultPort: '3000' },
  'vite': { name: 'Vite', defaultPort: '5173' },
  'remix': { name: 'Remix', defaultPort: '3000' },
  'astro': { name: 'Astro', defaultPort: '4321' },
  'nest': { name: 'NestJS', defaultPort: '3000' },
  'express': { name: 'Express', defaultPort: '3000' },
  'fastify': { name: 'Fastify', defaultPort: '3000' },
  'gatsby': { name: 'Gatsby', defaultPort: '8000' },
  'svelte': { name: 'SvelteKit', defaultPort: '5173' },
};

function isNodeCommand(command) {
  const baseCommand = command.split('/').pop();
  return NODE_COMMANDS.some(nc => baseCommand === nc || baseCommand.startsWith(nc + '.'));
}

function detectFramework(commandArgs) {
  const cmdString = commandArgs.join(' ').toLowerCase();
  for (const [pattern, info] of Object.entries(FRAMEWORK_PATTERNS)) {
    if (cmdString.includes(pattern)) return info;
  }
  return null;
}

export async function runDevCommand(commandArgs, options) {
  const [command, ...args] = commandArgs;
  const preloadPath = join(__dirname, 'preload.cjs');
  const isNode = isNodeCommand(command);
  const frameworkInfo = detectFramework(commandArgs);

  // Detect the app port - check environment, command args, or use framework default
  const appPort = process.env.PORT || frameworkInfo?.defaultPort || '3000';

  console.log(chalk.cyan('🔍 Pointa Dev Mode'));
  console.log(chalk.gray(`   Command: ${commandArgs.join(' ')}`));
  if (frameworkInfo) {
    console.log(chalk.gray(`   Framework: ${frameworkInfo.name}`));
  }
  console.log(chalk.gray(`   Mode: ${isNode ? 'Node.js (full instrumentation)' : 'Generic (stdout capture)'}`));
  console.log(chalk.gray(`   App port: ${appPort}`));
  console.log(chalk.gray(`   Server: ws://127.0.0.1:${options.port}/backend-logs`));
  console.log('');

  // Build environment
  const env = {
    ...process.env,
    POINTA_PORT: options.port,
    POINTA_APP_PORT: appPort  // Pass the detected app port to preload
  };

  if (isNode) {
    // Inject preload via NODE_OPTIONS
    const existingNodeOptions = process.env.NODE_OPTIONS || '';
    env.NODE_OPTIONS = `--require "${preloadPath}" ${existingNodeOptions}`.trim();
  }

  // Spawn the command
  const child = spawn(command, args, {
    stdio: 'inherit',  // Pass through stdin/stdout/stderr
    env,
    shell: true,       // Allow shell features like && and ||
  });

  // Handle signals
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
