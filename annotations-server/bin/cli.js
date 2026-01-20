#!/usr/bin/env node

import { Command } from 'commander';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, openSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { homedir } from 'os';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json automatically
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const execAsync = promisify(exec);
const program = new Command();

// Configuration paths
const CONFIG_DIR = join(homedir(), '.pointa');
const PID_FILE = join(CONFIG_DIR, 'server.pid');
const LOG_FILE = join(CONFIG_DIR, 'server.log');
const PORT = parseInt(process.env.POINTA_PORT || '4242', 10);

// Ensure config directory exists
if (!existsSync(CONFIG_DIR)) {
  mkdirSync(CONFIG_DIR, { recursive: true });
}

// Helper functions
function isServerRunning() {
  if (!existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = readFileSync(PID_FILE, 'utf8').trim();
    process.kill(parseInt(pid), 0); // Check if process exists
    return true;
  } catch (e) {
    // Process doesn't exist
    if (existsSync(PID_FILE)) {
      // Clean up stale PID file
      unlinkSync(PID_FILE);
    }
    return false;
  }
}

async function checkPort() {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Commands
program.
name('pointa-server').
description('Global MCP server for Pointa browser extension').
version(packageJson.version);

program.
command('start').
description('Start the Pointa server').
option('-f, --foreground', 'Run in foreground (not as daemon)').
action(async (options) => {
  if (isServerRunning()) {
    console.log(chalk.yellow('⚠️  Pointa server is already running'));
    console.log(chalk.gray(`   Use ${chalk.white('pointa-server status')} to check details`));
    return;
  }

  console.log(chalk.blue('🚀 Starting Pointa server...'));
  const serverPath = join(dirname(__dirname), 'lib', 'server.js');

  if (!options.foreground) {
    // Run as daemon
    const out = fs.openSync(LOG_FILE, 'a');
    const err = fs.openSync(LOG_FILE, 'a');

    const child = spawn('node', [serverPath], {
      detached: true,
      stdio: ['ignore', out, err],
      env: { ...process.env, NODE_ENV: 'production' }
    });

    child.unref();
    writeFileSync(PID_FILE, child.pid.toString());

    // Wait for server to start
    let attempts = 0;
    while (attempts < 10) {
      if (await checkPort()) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    if (attempts >= 10) {
      console.log(chalk.red('❌ Failed to start server'));
      console.log(chalk.gray(`   Check logs: ${chalk.white('pointa-server logs')}`));
      process.exit(1);
    }

    console.log(chalk.green(`✨ Pointa server v${packageJson.version} started`));
    console.log(chalk.gray(`   → API: ${chalk.white(`http://127.0.0.1:${PORT}`)}`));
    console.log(chalk.gray(`   → MCP: ${chalk.white(`http://127.0.0.1:${PORT}/mcp`)}`));
    console.log(chalk.gray(`   → Logs: ${chalk.white('pointa-server logs -f')}`));

  } else {
    // Run in foreground (only with -f flag)
    const child = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    writeFileSync(PID_FILE, child.pid.toString());

    child.on('exit', () => {
      if (existsSync(PID_FILE)) {
        unlinkSync(PID_FILE);
      }
    });
  }
});

program.
command('stop').
description('Stop the Pointa server').
action(() => {
  if (!isServerRunning()) {
    console.log(chalk.yellow('⚠️  Pointa server is not running'));
    return;
  }

  try {
    const pid = readFileSync(PID_FILE, 'utf8').trim();
    process.kill(parseInt(pid), 'SIGTERM');

    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }

    console.log(chalk.green('✓ Pointa server stopped'));
  } catch (error) {
    console.log(chalk.red(`❌ Failed to stop server: ${error.message}`));
  }
});

program.
command('restart').
description('Restart the Pointa server').
action(async () => {
  console.log(chalk.blue('🔄 Restarting Pointa server...'));

  // Stop if running
  if (isServerRunning()) {
    try {
      const pid = readFileSync(PID_FILE, 'utf8').trim();
      process.kill(parseInt(pid), 'SIGTERM');

      if (existsSync(PID_FILE)) {
        unlinkSync(PID_FILE);
      }

      console.log(chalk.gray('   Stopping old server...'));

      // Wait for process to stop
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(chalk.yellow(`   Warning: ${error.message}`));
    }
  }

  // Start with daemon flag
  program.parse(['node', 'cli.js', 'start'], { from: 'user' });
});

program.
command('status').
description('Check server status').
action(async () => {
  const running = isServerRunning();
  const portAvailable = await checkPort();

  console.log(chalk.blue('\n📊 Pointa Server Status\n'));

  if (running && portAvailable) {
    console.log(chalk.green('   Status: ') + chalk.green.bold('Running ✓'));
    console.log(chalk.gray(`   URL:    ${chalk.white(`http://127.0.0.1:${PORT}`)}`));
    console.log(chalk.gray(`   MCP:    ${chalk.white(`http://127.0.0.1:${PORT}/mcp`)}`));

    if (existsSync(PID_FILE)) {
      const pid = readFileSync(PID_FILE, 'utf8').trim();
      console.log(chalk.gray(`   PID:    ${chalk.white(pid)}`));
    }

    console.log(chalk.gray(`   Data:   ${chalk.white(CONFIG_DIR)}`));
  } else if (running && !portAvailable) {
    console.log(chalk.yellow('   Status: ') + chalk.yellow.bold('Starting...'));
    console.log(chalk.gray('   Server process exists but not responding yet'));
  } else {
    console.log(chalk.red('   Status: ') + chalk.red.bold('Stopped'));
    console.log(chalk.gray(`   Start with: ${chalk.white('pointa-server start')}`));
  }

  console.log('');
});

program.
command('logs').
description('View server logs').
option('-f, --follow', 'Follow log output').
option('-n, --lines <number>', 'Number of lines to show', '50').
action((options) => {
  if (!existsSync(LOG_FILE)) {
    console.log(chalk.yellow('⚠️  No log file found'));
    console.log(chalk.gray(`   Log file will be created when server starts: ${LOG_FILE}`));
    return;
  }

  if (options.follow) {
    // Use tail -f
    const tail = spawn('tail', ['-f', LOG_FILE], { stdio: 'inherit' });

    process.on('SIGINT', () => {
      tail.kill();
      process.exit();
    });
  } else {
    // Show last N lines
    const tail = spawn('tail', ['-n', options.lines, LOG_FILE], { stdio: 'inherit' });
  }
});

program.
command('dev').
description('Run a command with Pointa server log capture enabled').
argument('<command...>', 'Command to run (e.g., npm run dev)').
option('-p, --port <number>', 'Pointa server port', '4242').
action(async (commandArgs, options) => {
  const { runDevCommand } = await import('../lib/dev-runner.js');
  await runDevCommand(commandArgs, options);
});

// Stdio mode - run server directly with stdio transport
async function runStdioMode() {
  const serverPath = join(dirname(__dirname), 'lib', 'server.js');

  // Check if HTTP daemon is already running
  const portAvailable = await checkPort();

  if (!portAvailable) {
    // Start daemon in background for HTTP (Chrome extension)
    const out = fs.openSync(LOG_FILE, 'a');
    const err = fs.openSync(LOG_FILE, 'a');

    const daemon = spawn('node', [serverPath], {
      detached: true,
      stdio: ['ignore', out, err],
      env: { ...process.env, NODE_ENV: 'production', POINTA_HTTP_ONLY: 'true' }
    });

    daemon.unref();

    // Write PID file with error handling
    try {
      writeFileSync(PID_FILE, daemon.pid.toString());
    } catch (error) {
      console.error('Warning: Could not write PID file:', error.message);
      // Continue anyway - server still works without PID file
    }

    // Wait for daemon to start
    let attempts = 0;
    while (attempts < 20) {
      if (await checkPort()) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    if (attempts >= 20) {
      console.error('Failed to start Pointa HTTP daemon. Check logs at:', LOG_FILE);
      process.exit(1);
    }
  }

  // Now run server in stdio mode (this process handles MCP via stdio)
  const child = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env, POINTA_STDIO_MODE: 'true' }
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  child.on('error', (error) => {
    console.error('Failed to start stdio server:', error);
    process.exit(1);
  });
}

// Detect stdio mode: if no arguments provided, run in stdio mode
if (process.argv.length === 2) {
  // No command provided - run stdio mode
  runStdioMode().catch((error) => {
    console.error('Stdio mode error:', error);
    process.exit(1);
  });
} else {
  // Parse commands normally
  program.parse(process.argv);
}