import { MCP_SERVER_KEY } from '../constants.js';

/**
 * Merge a URL-only MCP server into Cursor/generic mcp.json.
 * Shape: { mcpServers: { [key]: { url } } }
 *
 * @param {string} raw
 * @param {string} url
 * @param {{ force?: boolean, key?: string }} [opts]
 * @returns {{ text: string, action: 'created'|'added'|'unchanged'|'replaced'|'skipped' }}
 */
export function mergeJsonMcpConfig(raw, url, opts = {}) {
  const key = opts.key || MCP_SERVER_KEY;
  const force = Boolean(opts.force);
  const empty = !raw || !String(raw).trim();

  let data = {};
  if (!empty) {
    try {
      data = JSON.parse(raw);
    } catch (e) {
      const err = new Error(`Invalid JSON MCP config: ${e.message}`);
      err.code = 'PARSE';
      throw err;
    }
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    const err = new Error('MCP config JSON must be an object');
    err.code = 'PARSE';
    throw err;
  }

  if (
    !data.mcpServers ||
    typeof data.mcpServers !== 'object' ||
    Array.isArray(data.mcpServers)
  ) {
    data.mcpServers = {};
  }

  const existing = data.mcpServers[key];
  if (!existing) {
    data.mcpServers[key] = { url };
    return {
      text: stringifyJson(data),
      action: empty ? 'created' : 'added',
    };
  }

  const existingUrl =
    typeof existing === 'object' && existing ? existing.url : null;
  if (existingUrl === url) {
    return { text: stringifyJson(data), action: 'unchanged' };
  }

  if (!force) {
    return { text: raw.endsWith('\n') ? raw : `${raw}\n`, action: 'skipped' };
  }

  data.mcpServers[key] = { ...existing, url };
  delete data.mcpServers[key].command;
  delete data.mcpServers[key].args;
  return { text: stringifyJson(data), action: 'replaced' };
}

/**
 * Claude user ~/.claude.json can nest mcpServers at top level.
 * Same merge as generic JSON.
 */
export function mergeClaudeJsonMcpConfig(raw, url, opts = {}) {
  return mergeJsonMcpConfig(raw, url, opts);
}

/**
 * Remove only our server key; leave the rest.
 * @returns {{ text: string|null, action: 'removed'|'unchanged'|'deleted-file' }}
 */
export function removeJsonMcpServer(raw, opts = {}) {
  const key = opts.key || MCP_SERVER_KEY;
  if (!raw || !String(raw).trim()) {
    return { text: null, action: 'unchanged' };
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    const err = new Error(`Invalid JSON MCP config: ${e.message}`);
    err.code = 'PARSE';
    throw err;
  }
  if (!data?.mcpServers?.[key]) {
    return { text: raw.endsWith('\n') ? raw : `${raw}\n`, action: 'unchanged' };
  }
  delete data.mcpServers[key];
  const leftover = Object.keys(data.mcpServers).length;
  if (leftover === 0 && Object.keys(data).length === 1) {
    return { text: null, action: 'deleted-file' };
  }
  return { text: stringifyJson(data), action: 'removed' };
}

function stringifyJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}
