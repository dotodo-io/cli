import { describe, expect, it } from 'vitest';
import { normalizeMcpUrl, parseArgs } from '../src/args.js';
import { DEFAULT_MCP_URL } from '../src/constants.js';

describe('parseArgs', () => {
  it('defaults to help with no argv', () => {
    expect(parseArgs([]).command).toBe('help');
  });

  it('parses install flags', () => {
    const opts = parseArgs([
      'install',
      '--agents',
      'cursor,grok',
      '--mcp-url',
      'http://127.0.0.1:8787',
      '--dry-run',
      '--force',
      '--project',
    ]);
    expect(opts.command).toBe('install');
    expect(opts.agents).toEqual(['cursor', 'grok']);
    expect(opts.mcpUrl).toBe('http://127.0.0.1:8787/mcp');
    expect(opts.dryRun).toBe(true);
    expect(opts.force).toBe(true);
    expect(opts.project).toBe(true);
    expect(opts.global).toBe(false);
  });

  it('rejects unknown agent', () => {
    expect(() => parseArgs(['install', '--agents', 'foo'])).toThrow(
      /Unknown agent/
    );
  });

  it('rejects skill-only + mcp-only', () => {
    expect(() => parseArgs(['install', '--no-mcp', '--mcp-only'])).toThrow(
      /either/
    );
  });

  it('treats --skill-only as noMcp', () => {
    expect(parseArgs(['install', '--skill-only']).noMcp).toBe(true);
  });

  it('defaults mcp url', () => {
    expect(parseArgs(['status']).mcpUrl).toBe(DEFAULT_MCP_URL);
  });
});

describe('normalizeMcpUrl', () => {
  it('appends /mcp when missing', () => {
    expect(normalizeMcpUrl('https://mcp.dotodo.io')).toBe(
      'https://mcp.dotodo.io/mcp'
    );
  });

  it('keeps existing /mcp', () => {
    expect(normalizeMcpUrl('https://mcp.dotodo.io/mcp/')).toBe(
      'https://mcp.dotodo.io/mcp'
    );
  });
});
