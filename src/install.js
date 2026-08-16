import { filterDetectedAgents, resolveAgentPaths } from './agents.js';
import { writeMcpConfig } from './mcp/index.js';
import { installSkill } from './skill.js';
import { fetchSkill } from './fetch-skill.js';

/**
 * @param {import('./args.js').CliOptions} opts
 * @param {{ detect?: boolean, fetch?: typeof fetch, cacheDir?: string, skillSrc?: string, ref?: string }} extra
 */
export async function runInstall(opts, extra = {}) {
  const detect =
    extra.detect !== false && opts.agents.length === 0 && !opts.allAgents;
  let agents = resolveAgentPaths(opts);
  if (detect) {
    agents = filterDetectedAgents(agents, opts.home, opts.cwd, opts.project);
  }

  let skillSrc = extra.skillSrc || null;
  if (!opts.mcpOnly && !opts.dryRun && !skillSrc) {
    skillSrc = await fetchSkill({
      home: opts.home,
      cacheDir: extra.cacheDir,
      ref: extra.ref,
      fetchImpl: extra.fetch,
    });
  }

  /** @type {Array<{agent: string, dest: string, action: string}>} */
  const skillResults = [];
  /** @type {import('./mcp/index.js').McpWriteResult[]} */
  const mcpResults = [];

  for (const agent of agents) {
    if (!opts.mcpOnly) {
      if (opts.dryRun) {
        skillResults.push({
          agent: agent.id,
          dest: agent.skillDir,
          action: 'dry-run',
        });
      } else {
        const r = installSkill(skillSrc, agent.skillDir, { dryRun: false });
        skillResults.push({ agent: agent.id, dest: r.dest, action: r.action });
      }
    }
    if (!opts.noMcp) {
      mcpResults.push(
        writeMcpConfig(agent, opts.mcpUrl, {
          dryRun: opts.dryRun,
          force: opts.force,
        })
      );
    }
  }

  return { agents, skillResults, mcpResults, skillSrc, mcpUrl: opts.mcpUrl };
}

export function printInstallReport(
  result,
  { dryRun = false, command = 'install' } = {}
) {
  const verb = dryRun
    ? 'Would'
    : command === 'update'
      ? 'Updated'
      : 'Installed';
  if (result.skillResults.length) {
    console.log(`${verb} skill:`);
    for (const r of result.skillResults) {
      console.log(`  ${r.agent} → ${r.dest} (${r.action})`);
    }
  }
  if (result.mcpResults.length) {
    console.log(`${dryRun ? 'Would write' : 'MCP entry'}:`);
    for (const r of result.mcpResults) {
      const extra = r.detail ? ` — ${r.detail}` : '';
      console.log(`  ${r.agent} → ${r.path || '(none)'} (${r.action})${extra}`);
    }
  }
  console.log('');
  console.log('Next: open your AI client and complete MCP sign-in (OAuth).');
  console.log(`MCP URL: ${result.mcpUrl}`);
  console.log('https://dotodo.io');
}
