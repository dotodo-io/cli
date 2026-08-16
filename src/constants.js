/** Default public MCP Streamable HTTP endpoint (no auth secrets). */
export const DEFAULT_MCP_URL = 'https://mcp.dotodo.io/mcp';

/** MCP server key written into client configs. */
export const MCP_SERVER_KEY = 'dotodo';

/** Skill folder name under agent skill roots. */
export const SKILL_NAME = 'dotodo';

export const AGENT_IDS = ['cursor', 'claude', 'codex', 'grok'];

export const SKILLS_REPO = 'dotodo-io/skills';

export const DEFAULT_SKILL_ZIP_URL =
  'https://github.com/dotodo-io/skills/releases/latest/download/skill.zip';

export function skillZipUrl(ref = 'latest') {
  if (!ref || ref === 'latest') return DEFAULT_SKILL_ZIP_URL;
  return `https://github.com/dotodo-io/skills/releases/download/${ref}/skill.zip`;
}

export function skillTarballUrl(ref = 'latest') {
  const gitRef = !ref || ref === 'latest' ? 'main' : ref;
  return `https://codeload.github.com/dotodo-io/skills/tar.gz/${gitRef}`;
}
