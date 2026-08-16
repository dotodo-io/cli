import { AGENT_IDS, DEFAULT_MCP_URL } from './constants.js';

/**
 * @typedef {object} CliOptions
 * @property {'install'|'update'|'uninstall'|'status'|'help'|'version'} command
 * @property {string[]} agents
 * @property {boolean} allAgents
 * @property {boolean} global
 * @property {boolean} project
 * @property {string} mcpUrl
 * @property {boolean} noMcp
 * @property {boolean} mcpOnly
 * @property {boolean} dryRun
 * @property {boolean} force
 * @property {boolean} keepMcp
 * @property {boolean} withMcp
 * @property {string} home
 * @property {string} cwd
 */

/**
 * @param {string[]} argv
 * @returns {CliOptions}
 */
export function parseArgs(argv) {
  const opts = {
    command: 'help',
    agents: [],
    allAgents: false,
    global: true,
    project: false,
    mcpUrl: process.env.DOTODO_MCP_URL || DEFAULT_MCP_URL,
    noMcp: false,
    mcpOnly: false,
    dryRun: false,
    force: false,
    keepMcp: false,
    withMcp: false,
    home: process.env.HOME || process.env.USERPROFILE || '',
    cwd: process.cwd(),
  };

  if (argv.length === 0) return opts;

  const [cmd, ...rest] = argv;
  const known = new Set([
    'install',
    'update',
    'uninstall',
    'status',
    'help',
    '--help',
    '-h',
    'version',
    '--version',
    '-v',
  ]);

  if (!known.has(cmd) && cmd.startsWith('-')) {
    // flags-only → help
  } else if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    opts.command = 'help';
  } else if (cmd === '--version' || cmd === '-v' || cmd === 'version') {
    opts.command = 'version';
  } else if (['install', 'update', 'uninstall', 'status'].includes(cmd)) {
    opts.command = cmd;
  } else {
    const err = new Error(`Unknown command: ${cmd}`);
    err.code = 'USAGE';
    throw err;
  }

  const flags = rest;

  for (let i = 0; i < flags.length; i++) {
    const a = flags[i];
    if (a === '--agents' || a === '-a') {
      const raw = flags[++i];
      if (!raw) throw usageError('--agents requires a value');
      if (raw === 'all') {
        opts.allAgents = true;
        opts.agents = [...AGENT_IDS];
      } else {
        opts.agents = raw
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        for (const id of opts.agents) {
          if (!AGENT_IDS.includes(id)) {
            throw usageError(
              `Unknown agent "${id}". Use: ${AGENT_IDS.join(', ')}, or all`
            );
          }
        }
      }
    } else if (a === '--global') {
      opts.global = true;
      opts.project = false;
    } else if (a === '--project') {
      opts.project = true;
      opts.global = false;
    } else if (a === '--mcp-url') {
      const url = flags[++i];
      if (!url) throw usageError('--mcp-url requires a value');
      opts.mcpUrl = normalizeMcpUrl(url);
    } else if (a === '--no-mcp' || a === '--skill-only') {
      opts.noMcp = true;
    } else if (a === '--mcp-only') {
      opts.mcpOnly = true;
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--force') {
      opts.force = true;
    } else if (a === '--keep-mcp') {
      opts.keepMcp = true;
    } else if (a === '--with-mcp') {
      opts.withMcp = true;
    } else if (a === '--home') {
      const home = flags[++i];
      if (!home) throw usageError('--home requires a value');
      opts.home = home;
    } else if (a === '--cwd') {
      const cwd = flags[++i];
      if (!cwd) throw usageError('--cwd requires a value');
      opts.cwd = cwd;
    } else if (a === '--help' || a === '-h') {
      opts.command = 'help';
    } else {
      throw usageError(`Unknown flag: ${a}`);
    }
  }

  if (opts.noMcp && opts.mcpOnly) {
    throw usageError(
      'Use either --no-mcp/--skill-only or --mcp-only, not both'
    );
  }

  opts.mcpUrl = normalizeMcpUrl(opts.mcpUrl);
  return opts;
}

export function normalizeMcpUrl(url) {
  const u = String(url).trim().replace(/\/$/, '');
  if (u.endsWith('/mcp')) return u;
  return `${u}/mcp`;
}

function usageError(msg) {
  const err = new Error(msg);
  err.code = 'USAGE';
  return err;
}

export function printHelp() {
  console.log(`dotodo CLI — install agent skill + MCP URL (no auth)

Usage:
  npx dotodo install [options]
  npx dotodo update  [options]
  npx dotodo uninstall [options]
  npx dotodo status  [options]

Commands:
  install     Download skill from GitHub and merge MCP server URL
  update      Same as install (overwrite skill; ensure MCP entry)
  uninstall   Remove skill dirs; remove MCP entry unless --keep-mcp
  status      Show what is installed

Options:
  --agents, -a <list|all>   cursor,claude,codex,grok or all (default: all known)
  --global                  User home paths (default)
  --project                 Project-local paths when supported
  --mcp-url <url>           MCP base or full .../mcp (default: ${DEFAULT_MCP_URL})
  --no-mcp, --skill-only    Skip MCP config
  --mcp-only                Only MCP config (skip skill files)
  --dry-run                 Print actions without writing
  --force                   Overwrite skill; replace differing MCP URL
  --keep-mcp                uninstall: leave MCP entry
  --with-mcp                uninstall: also remove MCP entry (default on uninstall)
  --home <path>             Override HOME (tests)
  --cwd <path>              Override project root (tests)

Environment:
  DOTODO_MCP_URL            Default MCP URL
  DOTODO_SKILL_REF          GitHub ref or release tag (default: latest zip)
  DOTODO_SKILL_DIR          Local skill folder (skip download)

This CLI only copies the skill and writes a URL-only MCP entry.
It does not log you in, store tokens, or call the API.
After install, sign in via your AI client (OAuth).
Guide: https://dotodo.io/setup/mcp
`);
}
