import { existsSync, readFileSync } from 'node:fs';
import { resolveAgentPaths } from './agents.js';
import { skillInstalled } from './skill.js';
import { extractSection } from './mcp/toml.js';
import { MCP_SERVER_KEY } from './constants.js';

export function runStatus(opts) {
  const agents = resolveAgentPaths(opts);
  return agents.map((agent) => {
    const skill = skillInstalled(agent.skillDir);
    let mcpUrl = null;
    let mcpPresent = false;
    if (agent.mcpConfigPath && existsSync(agent.mcpConfigPath)) {
      const raw = readFileSync(agent.mcpConfigPath, 'utf8');
      const parsed = readMcpUrl(raw, agent.mcpFormat);
      mcpUrl = parsed;
      mcpPresent = parsed != null;
    }
    return {
      agent: agent.id,
      label: agent.label,
      skillDir: agent.skillDir,
      skill,
      mcpConfigPath: agent.mcpConfigPath,
      mcpPresent,
      mcpUrl,
    };
  });
}

function readMcpUrl(raw, format) {
  if (format === 'toml') {
    const section = extractSection(raw, `[mcp_servers.${MCP_SERVER_KEY}]`);
    if (!section) return null;
    const m = section.body.match(/^\s*url\s*=\s*(.+)$/m);
    if (!m) return null;
    const v = m[1].trim().replace(/\s+#.*$/, '');
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return v.slice(1, -1);
    }
    return v;
  }
  try {
    const data = JSON.parse(raw);
    const entry = data?.mcpServers?.[MCP_SERVER_KEY];
    return entry?.url || null;
  } catch {
    return null;
  }
}

export function printStatus(rows) {
  for (const r of rows) {
    const skill = r.skill ? 'skill yes' : 'skill no';
    const mcp = r.mcpPresent ? `mcp ${r.mcpUrl}` : 'mcp no';
    console.log(`${r.label}: ${skill}; ${mcp}`);
    console.log(`  skill: ${r.skillDir}`);
    if (r.mcpConfigPath) console.log(`  mcp:   ${r.mcpConfigPath}`);
  }
}
