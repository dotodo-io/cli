import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  mergeClaudeJsonMcpConfig,
  mergeJsonMcpConfig,
  removeJsonMcpServer,
} from './json.js';
import { mergeTomlMcpConfig, removeTomlMcpServer } from './toml.js';

/**
 * @typedef {object} McpWriteResult
 * @property {string} agent
 * @property {string} path
 * @property {string} action
 * @property {string} [detail]
 */

/**
 * @param {import('../agents.js').AgentPaths} agent
 * @param {string} url
 * @param {{ dryRun?: boolean, force?: boolean }} opts
 * @returns {McpWriteResult}
 */
export function writeMcpConfig(agent, url, opts = {}) {
  if (!agent.mcpConfigPath || !agent.mcpFormat) {
    return {
      agent: agent.id,
      path: '',
      action: 'unsupported',
      detail: 'No known MCP config path',
    };
  }

  const filePath = agent.mcpConfigPath;
  const exists = existsSync(filePath);
  const raw = exists ? readFileSync(filePath, 'utf8') : '';

  let merged;
  if (agent.mcpFormat === 'toml') {
    merged = mergeTomlMcpConfig(raw, url, { force: opts.force });
  } else if (agent.mcpFormat === 'claude-json') {
    merged = mergeClaudeJsonMcpConfig(raw, url, { force: opts.force });
  } else {
    merged = mergeJsonMcpConfig(raw, url, { force: opts.force });
  }

  if (merged.action === 'skipped') {
    return {
      agent: agent.id,
      path: filePath,
      action: 'skipped',
      detail: `Existing MCP URL differs. Re-run with --force to set ${url}`,
    };
  }

  if (merged.action === 'unchanged') {
    return { agent: agent.id, path: filePath, action: 'unchanged' };
  }

  if (!opts.dryRun) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, merged.text, 'utf8');
  }

  return { agent: agent.id, path: filePath, action: merged.action };
}

/**
 * @param {import('../agents.js').AgentPaths} agent
 * @param {{ dryRun?: boolean }} opts
 */
export function removeMcpConfig(agent, opts = {}) {
  if (!agent.mcpConfigPath || !agent.mcpFormat) {
    return { agent: agent.id, path: '', action: 'unsupported' };
  }
  const filePath = agent.mcpConfigPath;
  if (!existsSync(filePath)) {
    return { agent: agent.id, path: filePath, action: 'unchanged' };
  }
  const raw = readFileSync(filePath, 'utf8');
  const removed =
    agent.mcpFormat === 'toml'
      ? removeTomlMcpServer(raw)
      : removeJsonMcpServer(raw);

  if (removed.action === 'unchanged') {
    return { agent: agent.id, path: filePath, action: 'unchanged' };
  }

  if (!opts.dryRun) {
    if (removed.text == null) {
      rmSync(filePath, { force: true });
    } else {
      writeFileSync(filePath, removed.text, 'utf8');
    }
  }

  return { agent: agent.id, path: filePath, action: removed.action };
}

export {
  mergeJsonMcpConfig,
  mergeClaudeJsonMcpConfig,
  removeJsonMcpServer,
} from './json.js';
export { mergeTomlMcpConfig, removeTomlMcpServer } from './toml.js';
