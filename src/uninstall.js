import { filterDetectedAgents, resolveAgentPaths } from './agents.js';
import { removeMcpConfig } from './mcp/index.js';
import { uninstallSkill } from './skill.js';

export function runUninstall(opts) {
  const detect = opts.agents.length === 0 && !opts.allAgents;
  let agents = resolveAgentPaths(opts);
  if (detect) {
    agents = filterDetectedAgents(agents, opts.home, opts.cwd, opts.project);
  }

  const skillResults = [];
  const mcpResults = [];
  const removeMcp = opts.withMcp || !opts.keepMcp;

  for (const agent of agents) {
    skillResults.push({
      agent: agent.id,
      dest: agent.skillDir,
      action: uninstallSkill(agent.skillDir, { dryRun: opts.dryRun }).action,
    });
    if (removeMcp) {
      mcpResults.push(removeMcpConfig(agent, { dryRun: opts.dryRun }));
    }
  }

  return { agents, skillResults, mcpResults, removeMcp };
}

export function printUninstallReport(result, { dryRun = false } = {}) {
  console.log(`${dryRun ? 'Would remove' : 'Removed'} skill:`);
  for (const r of result.skillResults) {
    console.log(`  ${r.agent} → ${r.dest} (${r.action})`);
  }
  if (result.removeMcp && result.mcpResults.length) {
    console.log(`${dryRun ? 'Would remove' : 'Removed'} MCP entry:`);
    for (const r of result.mcpResults) {
      console.log(`  ${r.agent} → ${r.path || '(none)'} (${r.action})`);
    }
  }
}
