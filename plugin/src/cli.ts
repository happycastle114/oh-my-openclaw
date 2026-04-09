/**
 * Oh-My-OpenClaw CLI Installer
 *
 * Usage:
 *   npx @happycastle/oh-my-openclaw install   — Clone repo, symlink skills, init workspace, build plugin
 *   npx @happycastle/oh-my-openclaw status    — Check installation health
 *   npx @happycastle/oh-my-openclaw init      — Initialize workspace only (notepads, plans)
 */

import { existsSync, lstatSync, mkdirSync, readlinkSync, symlinkSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { shellExecAsync, spawnInheritAsync } from './utils/exec-adapter.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const REPO_URL = 'https://github.com/happycastle114/oh-my-openclaw.git';
const DEFAULT_INSTALL_DIR = join(homedir(), '.oh-my-openclaw');
const OPENCLAW_SKILLS_DIR = join(homedir(), '.openclaw', 'workspace', 'skills');
const SKILL_LINK_NAME = 'oh-my-openclaw';

const WORKSPACE_DIRS = ['plans', 'notepads', 'reports', 'checkpoints', 'tmp'];

const NOTEPAD_TEMPLATES: Record<string, string> = {
  'learnings.md': '# Learnings\n\nAccumulated insights from project work.\n\n## Format\n\n- **[DATE]** [CONTEXT]: [LEARNING]\n',
  'decisions.md': '# Decisions\n\nArchitectural and design decisions made during work.\n\n## Format\n\n- **[DATE]** [DECISION]: [RATIONALE]\n',
  'issues.md': '# Issues\n\nKnown issues, blockers, and workarounds.\n\n## Format\n\n- **[DATE]** [ISSUE]: [STATUS] - [DETAILS]\n',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function ok(msg: string): void {
  console.log(`  ${GREEN}✅${RESET} ${msg}`);
}

function warn(msg: string): void {
  console.log(`  ${YELLOW}⚠️${RESET}  ${msg}`);
}

function info(msg: string): void {
  console.log(`  ${BLUE}📦${RESET} ${msg}`);
}

function fail(msg: string): void {
  console.error(`  ${RED}❌${RESET} ${msg}`);
}

function dim(msg: string): void {
  console.log(`  ${DIM}${msg}${RESET}`);
}

function heading(msg: string): void {
  console.log(`\n${BLUE}${msg}${RESET}`);
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await shellExecAsync(`command -v ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

async function run(cmd: string, opts?: { cwd?: string; silent?: boolean; throwOnError?: boolean }): Promise<string> {
  const throwOnError = opts?.throwOnError ?? false;
  try {
    if (opts?.silent) {
      return await shellExecAsync(cmd, { cwd: opts?.cwd });
    }
    await spawnInheritAsync(cmd, { cwd: opts?.cwd });
    return '';
  } catch (e: unknown) {
    if (!throwOnError) {
      const err = e as { stdout?: string };
      return err.stdout?.toString().trim() ?? '';
    }
    throw e;
  }
}

function isSymlink(p: string): boolean {
  try {
    const lstat = lstatSync(p);
    return lstat.isSymbolicLink();
  } catch {
    return false;
  }
}

// ── Commands ───────────────────────────────────────────────────────────────────

async function install(installDir: string): Promise<void> {
  console.log(`\n${BLUE}🔧 Oh-My-OpenClaw Installer${RESET}`);
  console.log('='.repeat(40));

  // Step 1: Prerequisites
  heading('Checking prerequisites...');

  if (!(await commandExists('git'))) {
    fail('git not found. Install git first.');
    process.exit(1);
  }
  ok('git found');

  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (major < 18) {
    fail(`Node.js ${nodeVersion} detected. Requires Node 18+.`);
    process.exit(1);
  }
  ok(`Node.js ${nodeVersion}`);

  // Step 2: Clone or update
  heading('Setting up repository...');

  if (existsSync(join(installDir, '.git'))) {
    info(`Existing installation found at ${installDir}`);
    dim('Pulling latest changes...');
    await run('git pull --ff-only', { cwd: installDir, silent: true });
    ok('Repository updated');
  } else if (existsSync(installDir)) {
    warn(`${installDir} exists but is not a git repo. Skipping clone.`);
  } else {
    info(`Cloning to ${installDir}`);
    await run(`git clone ${REPO_URL} "${installDir}"`);
    ok('Clone complete');
  }

  // Step 3: Symlink into OpenClaw skills
  heading('Setting up OpenClaw skill...');

  const skillPath = join(OPENCLAW_SKILLS_DIR, SKILL_LINK_NAME);

  mkdirSync(OPENCLAW_SKILLS_DIR, { recursive: true });

  if (existsSync(skillPath)) {
    if (isSymlink(skillPath)) {
      const target = readlinkSync(skillPath);
      if (resolve(target) === resolve(installDir)) {
        ok(`Symlink already correct → ${installDir}`);
      } else {
        warn(`Symlink points to ${target}, updating...`);
        unlinkSync(skillPath);
        symlinkSync(installDir, skillPath);
        ok(`Symlink updated → ${installDir}`);
      }
    } else {
      warn(`${skillPath} exists and is not a symlink. Skipping.`);
      dim(`Remove it manually: rm -rf ${skillPath}`);
    }
  } else {
    symlinkSync(installDir, skillPath);
    ok(`Symlink created: ${skillPath} → ${installDir}`);
  }

  // Step 4: Init workspace
  heading('Initializing workspace...');
  initWorkspace(installDir);

  // Step 5: Build plugin
  heading('Building plugin...');

  const pluginDir = join(installDir, 'plugin');
  if (existsSync(join(pluginDir, 'package.json'))) {
    info('Installing dependencies...');
    await run('npm install', { cwd: pluginDir, throwOnError: true });
    ok('Dependencies installed');

    info('Building TypeScript...');
    try {
      await run('npm run build', { cwd: pluginDir, throwOnError: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      fail(`Plugin build failed: ${message}`);
      process.exit(1);
    }
    ok('Plugin built');

    // Run tests silently to verify
    info('Running tests...');
    const testResult = await run('npm run test -- --run 2>&1', { cwd: pluginDir, silent: true });
    if (testResult.includes('passed') || testResult.includes('✓')) {
      ok('Tests passing');
    } else {
      warn('Tests may have issues — run `npm test` in plugin/ to check');
    }
  } else {
    warn('Plugin directory not found. Skipping build.');
  }

  // Step 6: Done
  console.log(`\n${'='.repeat(40)}`);
  console.log(`${GREEN}🎉 Installation complete!${RESET}\n`);
  console.log('Available commands:');
  console.log(`  ${BLUE}/ultrawork [task]${RESET}  — Full automation (plan → execute → verify)`);
  console.log(`  ${BLUE}/plan [task]${RESET}       — Create a plan only`);
  console.log(`  ${BLUE}/start_work${RESET}       — Execute existing plan`);
  console.log(`\nSend a message to your OpenClaw agent to get started!`);
  console.log(`\n${DIM}Tip: Ask your agent "Read the oh-my-openclaw skill and tell me what it does"${RESET}\n`);
}

function initWorkspace(baseDir: string): void {
  const workspaceRoot = join(baseDir, 'workspace');

  for (const dir of WORKSPACE_DIRS) {
    const dirPath = join(workspaceRoot, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      ok(`Created ${dir}/`);
    } else {
      dim(`Exists: ${dir}/`);
    }
  }

  const notepadsDir = join(workspaceRoot, 'notepads');
  for (const [filename, content] of Object.entries(NOTEPAD_TEMPLATES)) {
    const filepath = join(notepadsDir, filename);
    if (!existsSync(filepath)) {
      writeFileSync(filepath, content, 'utf-8');
      ok(`Created notepads/${filename}`);
    } else {
      dim(`Exists: notepads/${filename}`);
    }
  }
}

async function status(): Promise<void> {
  console.log(`\n${BLUE}📊 Oh-My-OpenClaw Status${RESET}`);
  console.log('='.repeat(40));

  // Check install dir
  const installDir = DEFAULT_INSTALL_DIR;
  if (existsSync(join(installDir, '.git'))) {
    ok(`Repository: ${installDir}`);
    const branch = await run('git branch --show-current', { cwd: installDir, silent: true });
    dim(`Branch: ${branch || 'unknown'}`);
  } else if (existsSync(installDir)) {
    warn(`${installDir} exists but is not a git repo`);
  } else {
    fail(`Not installed. Run: npx @happycastle/oh-my-openclaw install`);
    return;
  }

  // Check symlink
  const skillPath = join(OPENCLAW_SKILLS_DIR, SKILL_LINK_NAME);
  if (existsSync(skillPath)) {
    if (isSymlink(skillPath)) {
      const target = readlinkSync(skillPath);
      ok(`Skill symlink: ${skillPath} → ${target}`);
    } else {
      warn(`Skill directory exists but is not a symlink: ${skillPath}`);
    }
  } else {
    fail(`Skill not linked at ${skillPath}`);
  }

  // Check workspace
  const workspaceRoot = join(installDir, 'workspace');
  if (existsSync(workspaceRoot)) {
    const dirs = WORKSPACE_DIRS.filter(d => existsSync(join(workspaceRoot, d)));
    ok(`Workspace: ${dirs.length}/${WORKSPACE_DIRS.length} directories`);
  } else {
    warn('Workspace not initialized. Run: npx @happycastle/oh-my-openclaw init');
  }

  // Check plugin build
  const pluginDist = join(installDir, 'plugin', 'dist', 'index.js');
  if (existsSync(pluginDist)) {
    ok('Plugin: built');
  } else {
    warn('Plugin: not built. Run `cd plugin && npm run build`');
  }

  console.log('');
}

// ── Main ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];
const installDir = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : DEFAULT_INSTALL_DIR;

switch (command) {
  case 'install':
    await install(installDir);
    break;
  case 'init':
    heading('Initializing workspace...');
    initWorkspace(installDir);
    console.log(`\n${GREEN}Workspace initialized.${RESET}\n`);
    break;
  case 'status':
    await status();
    break;
  case '--help':
  case '-h':
  case undefined:
    console.log(`
${BLUE}Oh-My-OpenClaw${RESET} — Multi-agent orchestration for OpenClaw

${BLUE}Usage:${RESET}
  npx @happycastle/oh-my-openclaw install   Clone repo, set up skills, build plugin
  npx @happycastle/oh-my-openclaw status    Check installation health
  npx @happycastle/oh-my-openclaw init      Initialize workspace only

${BLUE}Options:${RESET}
  --dir <path>   Custom install directory (default: ~/.oh-my-openclaw)
  --help, -h     Show this help
`);
    break;
  default:
    fail(`Unknown command: ${command}`);
    console.log('Run with --help for usage info.');
    process.exit(1);
}
