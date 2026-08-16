import { afterEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInstall } from '../src/install.js';
import { runUninstall } from '../src/uninstall.js';
import { runStatus } from '../src/status.js';
import { DEFAULT_MCP_URL } from '../src/constants.js';

function tmpHome() {
  return path.join(
    os.tmpdir(),
    `dotodo-cli-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function writeFixtureSkill(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), '# fixture\n');
  writeFileSync(path.join(dir, 'icon.svg'), '<svg />\n');
  mkdirSync(path.join(dir, 'agents'), { recursive: true });
  writeFileSync(path.join(dir, 'agents', 'openai.yaml'), 'name: fixture\n');
  return dir;
}

function baseOpts(home, extra = {}) {
  return {
    command: 'install',
    agents: ['cursor', 'claude', 'codex', 'grok'],
    allAgents: true,
    global: true,
    project: false,
    mcpUrl: DEFAULT_MCP_URL,
    noMcp: false,
    mcpOnly: false,
    dryRun: false,
    force: false,
    keepMcp: false,
    withMcp: false,
    home,
    cwd: home,
    ...extra,
  };
}

describe('install / uninstall / status (tmp home)', () => {
  /** @type {string[]} */
  const homes = [];
  afterEach(() => {
    for (const h of homes) rmSync(h, { recursive: true, force: true });
    homes.length = 0;
  });

  it('installs skill + mcp for all agents and is idempotent', async () => {
    const home = tmpHome();
    homes.push(home);
    mkdirSync(home, { recursive: true });
    const skillSrc = writeFixtureSkill(path.join(home, 'fixture-skill'));

    const first = await runInstall(baseOpts(home), { skillSrc });
    expect(first.skillResults).toHaveLength(4);
    expect(
      first.mcpResults.every(
        (r) => r.action === 'created' || r.action === 'added'
      )
    ).toBe(true);

    expect(
      existsSync(path.join(home, '.cursor', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(true);
    expect(
      existsSync(path.join(home, '.claude', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(true);
    expect(
      existsSync(path.join(home, '.codex', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(true);
    expect(
      existsSync(path.join(home, '.grok', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(true);

    const cursorMcp = JSON.parse(
      readFileSync(path.join(home, '.cursor', 'mcp.json'), 'utf8')
    );
    expect(cursorMcp.mcpServers.dotodo.url).toBe(DEFAULT_MCP_URL);

    const claudeJson = JSON.parse(
      readFileSync(path.join(home, '.claude.json'), 'utf8')
    );
    expect(claudeJson.mcpServers.dotodo.url).toBe(DEFAULT_MCP_URL);

    const codex = readFileSync(
      path.join(home, '.codex', 'config.toml'),
      'utf8'
    );
    expect(codex).toContain('[mcp_servers.dotodo]');
    expect(codex).toContain(DEFAULT_MCP_URL);

    const grok = readFileSync(path.join(home, '.grok', 'config.toml'), 'utf8');
    expect(grok).toContain('[mcp_servers.dotodo]');

    const second = await runInstall(baseOpts(home), { skillSrc });
    expect(second.mcpResults.every((r) => r.action === 'unchanged')).toBe(true);

    const status = runStatus(baseOpts(home));
    expect(
      status.every(
        (s) => s.skill && s.mcpPresent && s.mcpUrl === DEFAULT_MCP_URL
      )
    ).toBe(true);
  });

  it('dry-run writes nothing and does not fetch', async () => {
    const home = tmpHome();
    homes.push(home);
    mkdirSync(home, { recursive: true });
    const fetchImpl = async () => {
      throw new Error('fetch should not run on dry-run');
    };
    await runInstall(baseOpts(home, { dryRun: true }), { fetch: fetchImpl });
    expect(existsSync(path.join(home, '.cursor'))).toBe(false);
    expect(existsSync(path.join(home, '.claude.json'))).toBe(false);
  });

  it('uninstall removes skill and only the dotodo mcp entry', async () => {
    const home = tmpHome();
    homes.push(home);
    mkdirSync(path.join(home, '.cursor'), { recursive: true });
    const skillSrc = writeFixtureSkill(path.join(home, 'fixture-skill'));
    writeFileSync(
      path.join(home, '.cursor', 'mcp.json'),
      JSON.stringify(
        { mcpServers: { keep: { url: 'https://keep.example/mcp' } } },
        null,
        2
      )
    );

    await runInstall(baseOpts(home, { agents: ['cursor'] }), { skillSrc });
    const afterInstall = JSON.parse(
      readFileSync(path.join(home, '.cursor', 'mcp.json'), 'utf8')
    );
    expect(afterInstall.mcpServers.keep.url).toBe('https://keep.example/mcp');
    expect(afterInstall.mcpServers.dotodo.url).toBe(DEFAULT_MCP_URL);

    runUninstall(baseOpts(home, { agents: ['cursor'] }));
    expect(
      existsSync(path.join(home, '.cursor', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(false);
    const after = JSON.parse(
      readFileSync(path.join(home, '.cursor', 'mcp.json'), 'utf8')
    );
    expect(after.mcpServers.keep).toBeDefined();
    expect(after.mcpServers.dotodo).toBeUndefined();
  });

  it('uninstall --keep-mcp leaves mcp entry', async () => {
    const home = tmpHome();
    homes.push(home);
    mkdirSync(home, { recursive: true });
    const skillSrc = writeFixtureSkill(path.join(home, 'fixture-skill'));
    await runInstall(baseOpts(home, { agents: ['cursor'] }), { skillSrc });
    runUninstall(baseOpts(home, { agents: ['cursor'], keepMcp: true }));
    expect(
      existsSync(path.join(home, '.cursor', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(false);
    const mcp = JSON.parse(
      readFileSync(path.join(home, '.cursor', 'mcp.json'), 'utf8')
    );
    expect(mcp.mcpServers.dotodo.url).toBe(DEFAULT_MCP_URL);
  });

  it('--skill-only skips mcp files', async () => {
    const home = tmpHome();
    homes.push(home);
    mkdirSync(home, { recursive: true });
    const skillSrc = writeFixtureSkill(path.join(home, 'fixture-skill'));
    await runInstall(baseOpts(home, { agents: ['cursor'], noMcp: true }), {
      skillSrc,
    });
    expect(
      existsSync(path.join(home, '.cursor', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(true);
    expect(existsSync(path.join(home, '.cursor', 'mcp.json'))).toBe(false);
  });

  it('project scope writes under cwd', async () => {
    const home = tmpHome();
    const cwd = path.join(home, 'repo');
    homes.push(home);
    mkdirSync(cwd, { recursive: true });
    const skillSrc = writeFixtureSkill(path.join(home, 'fixture-skill'));
    await runInstall(
      baseOpts(home, {
        agents: ['cursor', 'claude'],
        project: true,
        global: false,
        cwd,
      }),
      { skillSrc }
    );
    expect(
      existsSync(path.join(cwd, '.cursor', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(true);
    expect(existsSync(path.join(cwd, '.cursor', 'mcp.json'))).toBe(true);
    expect(
      existsSync(path.join(cwd, '.claude', 'skills', 'dotodo', 'SKILL.md'))
    ).toBe(true);
    expect(existsSync(path.join(cwd, '.mcp.json'))).toBe(true);
    expect(existsSync(path.join(home, '.cursor'))).toBe(false);
  });

  it('does not overwrite a different mcp url without --force', async () => {
    const home = tmpHome();
    homes.push(home);
    mkdirSync(path.join(home, '.cursor'), { recursive: true });
    const skillSrc = writeFixtureSkill(path.join(home, 'fixture-skill'));
    writeFileSync(
      path.join(home, '.cursor', 'mcp.json'),
      JSON.stringify(
        { mcpServers: { dotodo: { url: 'https://old.example/mcp' } } },
        null,
        2
      )
    );
    const r = await runInstall(baseOpts(home, { agents: ['cursor'] }), {
      skillSrc,
    });
    expect(r.mcpResults[0].action).toBe('skipped');
    const mcp = JSON.parse(
      readFileSync(path.join(home, '.cursor', 'mcp.json'), 'utf8')
    );
    expect(mcp.mcpServers.dotodo.url).toBe('https://old.example/mcp');

    const forced = await runInstall(
      baseOpts(home, { agents: ['cursor'], force: true }),
      { skillSrc }
    );
    expect(forced.mcpResults[0].action).toBe('replaced');
    const after = JSON.parse(
      readFileSync(path.join(home, '.cursor', 'mcp.json'), 'utf8')
    );
    expect(after.mcpServers.dotodo.url).toBe(DEFAULT_MCP_URL);
  });

  it('defaults to agents that already have a home dir', async () => {
    const home = tmpHome();
    homes.push(home);
    mkdirSync(path.join(home, '.cursor'), { recursive: true });
    const skillSrc = writeFixtureSkill(path.join(home, 'fixture-skill'));
    const r = await runInstall(
      {
        ...baseOpts(home),
        agents: [],
        allAgents: false,
      },
      { skillSrc }
    );
    expect(r.skillResults.map((s) => s.agent)).toEqual(['cursor']);
    expect(existsSync(path.join(home, '.grok', 'skills', 'dotodo'))).toBe(
      false
    );
  });

  it('merges grok toml without dropping other keys', async () => {
    const home = tmpHome();
    homes.push(home);
    mkdirSync(path.join(home, '.grok'), { recursive: true });
    const skillSrc = writeFixtureSkill(path.join(home, 'fixture-skill'));
    writeFileSync(
      path.join(home, '.grok', 'config.toml'),
      'model = "keep-me"\n'
    );
    await runInstall(baseOpts(home, { agents: ['grok'] }), { skillSrc });
    const text = readFileSync(path.join(home, '.grok', 'config.toml'), 'utf8');
    expect(text).toContain('model = "keep-me"');
    expect(text).toContain('[mcp_servers.dotodo]');
  });
});
