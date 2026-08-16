import { existsSync } from 'node:fs';
import path from 'node:path';
import { AGENT_IDS, SKILL_NAME } from './constants.js';

/**
 * @typedef {'cursor'|'claude'|'codex'|'grok'} AgentId
 * @typedef {'json'|'toml'|'claude-json'} McpFormat
 *
 * @typedef {object} AgentPaths
 * @property {AgentId} id
 * @property {string} label
 * @property {string} skillDir
 * @property {string|null} mcpConfigPath
 * @property {McpFormat|null} mcpFormat
 */

/**
 * @param {import('./args.js').CliOptions} opts
 * @returns {AgentPaths[]}
 */
export function resolveAgentPaths(opts) {
  const home = opts.home;
  const cwd = opts.cwd;
  const project = opts.project;

  /** @type {Record<AgentId, () => AgentPaths>} */
  const builders = {
    cursor: () => ({
      id: 'cursor',
      label: 'Cursor',
      skillDir: project
        ? path.join(cwd, '.cursor', 'skills', SKILL_NAME)
        : path.join(home, '.cursor', 'skills', SKILL_NAME),
      mcpConfigPath: project
        ? path.join(cwd, '.cursor', 'mcp.json')
        : path.join(home, '.cursor', 'mcp.json'),
      mcpFormat: 'json',
    }),
    claude: () => ({
      id: 'claude',
      label: 'Claude Code',
      skillDir: project
        ? path.join(cwd, '.claude', 'skills', SKILL_NAME)
        : path.join(home, '.claude', 'skills', SKILL_NAME),
      // Project: .mcp.json; user: ~/.claude.json (mcpServers)
      mcpConfigPath: project
        ? path.join(cwd, '.mcp.json')
        : path.join(home, '.claude.json'),
      mcpFormat: project ? 'json' : 'claude-json',
    }),
    codex: () => ({
      id: 'codex',
      label: 'Codex',
      skillDir: project
        ? path.join(cwd, '.codex', 'skills', SKILL_NAME)
        : path.join(home, '.codex', 'skills', SKILL_NAME),
      mcpConfigPath: project
        ? path.join(cwd, '.codex', 'config.toml')
        : path.join(home, '.codex', 'config.toml'),
      mcpFormat: 'toml',
    }),
    grok: () => ({
      id: 'grok',
      label: 'Grok',
      skillDir: project
        ? path.join(cwd, '.grok', 'skills', SKILL_NAME)
        : path.join(home, '.grok', 'skills', SKILL_NAME),
      mcpConfigPath: project
        ? path.join(cwd, '.grok', 'config.toml')
        : path.join(home, '.grok', 'config.toml'),
      mcpFormat: 'toml',
    }),
  };

  const ids = opts.agents.length > 0 ? opts.agents : [...AGENT_IDS];
  return ids.map((id) => builders[id]());
}

/**
 * Prefer agents that already have a config/skills root; if none, return all.
 * @param {AgentPaths[]} agents
 * @param {string} home
 * @param {string} cwd
 * @param {boolean} project
 */
export function filterDetectedAgents(agents, home, cwd, project) {
  const detected = agents.filter((a) => {
    const root = agentHomeRoot(a.id, home, cwd, project);
    return root && existsSync(root);
  });
  return detected.length > 0 ? detected : agents;
}

function agentHomeRoot(id, home, cwd, project) {
  if (project) {
    const map = {
      cursor: path.join(cwd, '.cursor'),
      claude: path.join(cwd, '.claude'),
      codex: path.join(cwd, '.codex'),
      grok: path.join(cwd, '.grok'),
    };
    return map[id];
  }
  const map = {
    cursor: path.join(home, '.cursor'),
    claude: path.join(home, '.claude'),
    codex: path.join(home, '.codex'),
    grok: path.join(home, '.grok'),
  };
  return map[id];
}

export { AGENT_IDS };
