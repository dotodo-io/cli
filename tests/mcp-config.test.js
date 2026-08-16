import { describe, expect, it } from 'vitest';
import {
  mergeJsonMcpConfig,
  removeJsonMcpServer,
} from '../src/mcp/json.js';
import {
  mergeTomlMcpConfig,
  removeTomlMcpServer,
} from '../src/mcp/toml.js';

const URL = 'https://mcp.dotodo.io/mcp';
const OTHER = 'https://example.test/mcp';

describe('mergeJsonMcpConfig', () => {
  it('creates a new file', () => {
    const r = mergeJsonMcpConfig('', URL);
    expect(r.action).toBe('created');
    expect(JSON.parse(r.text)).toEqual({
      mcpServers: { dotodo: { url: URL } },
    });
  });

  it('adds beside existing servers', () => {
    const raw = JSON.stringify({ mcpServers: { other: { url: 'x' } } });
    const r = mergeJsonMcpConfig(raw, URL);
    expect(r.action).toBe('added');
    const data = JSON.parse(r.text);
    expect(data.mcpServers.other.url).toBe('x');
    expect(data.mcpServers.dotodo.url).toBe(URL);
  });

  it('is idempotent for same url', () => {
    const raw = JSON.stringify(
      { mcpServers: { dotodo: { url: URL } } },
      null,
      2
    );
    const r = mergeJsonMcpConfig(raw, URL);
    expect(r.action).toBe('unchanged');
  });

  it('skips different url without force', () => {
    const raw = JSON.stringify(
      { mcpServers: { dotodo: { url: OTHER } } },
      null,
      2
    );
    const r = mergeJsonMcpConfig(raw, URL);
    expect(r.action).toBe('skipped');
    expect(JSON.parse(r.text).mcpServers.dotodo.url).toBe(OTHER);
  });

  it('replaces url with force and keeps extra keys', () => {
    const raw = JSON.stringify({
      mcpServers: { dotodo: { url: OTHER, type: 'http' } },
    });
    const r = mergeJsonMcpConfig(raw, URL, { force: true });
    expect(r.action).toBe('replaced');
    expect(JSON.parse(r.text).mcpServers.dotodo).toEqual({
      url: URL,
      type: 'http',
    });
  });

  it('throws on invalid json', () => {
    expect(() => mergeJsonMcpConfig('{', URL)).toThrow(/Invalid JSON/);
  });
});

describe('removeJsonMcpServer', () => {
  it('removes only dotodo and keeps others', () => {
    const raw = JSON.stringify({
      mcpServers: { dotodo: { url: URL }, keep: { url: 'y' } },
    });
    const r = removeJsonMcpServer(raw);
    expect(r.action).toBe('removed');
    expect(JSON.parse(r.text).mcpServers).toEqual({ keep: { url: 'y' } });
  });

  it('marks file deletable when only mcpServers.dotodo existed', () => {
    const raw = JSON.stringify({ mcpServers: { dotodo: { url: URL } } });
    const r = removeJsonMcpServer(raw);
    expect(r.action).toBe('deleted-file');
    expect(r.text).toBeNull();
  });

  it('keeps claude.json extras when removing last server', () => {
    const raw = JSON.stringify({
      theme: 'dark',
      mcpServers: { dotodo: { url: URL } },
    });
    const r = removeJsonMcpServer(raw);
    expect(r.action).toBe('removed');
    const data = JSON.parse(r.text);
    expect(data.theme).toBe('dark');
    expect(data.mcpServers.dotodo).toBeUndefined();
  });
});

describe('mergeTomlMcpConfig', () => {
  it('creates a section on empty file', () => {
    const r = mergeTomlMcpConfig('', URL);
    expect(r.action).toBe('created');
    expect(r.text).toContain('[mcp_servers.dotodo]');
    expect(r.text).toContain(`url = "${URL}"`);
  });

  it('appends without destroying other sections', () => {
    const raw = 'model = "x"\n\n[mcp_servers.other]\nurl = "y"\n';
    const r = mergeTomlMcpConfig(raw, URL);
    expect(r.action).toBe('added');
    expect(r.text).toContain('model = "x"');
    expect(r.text).toContain('[mcp_servers.other]');
    expect(r.text).toContain('[mcp_servers.dotodo]');
  });

  it('is idempotent', () => {
    const raw = `[mcp_servers.dotodo]\nurl = "${URL}"\n`;
    expect(mergeTomlMcpConfig(raw, URL).action).toBe('unchanged');
  });

  it('skips different url without force', () => {
    const raw = `[mcp_servers.dotodo]\nurl = "${OTHER}"\nenabled = true\n`;
    const r = mergeTomlMcpConfig(raw, URL);
    expect(r.action).toBe('skipped');
    expect(r.text).toContain(OTHER);
  });

  it('replaces url with force and keeps sibling keys', () => {
    const raw = `[mcp_servers.dotodo]\nurl = "${OTHER}"\nenabled = true\n`;
    const r = mergeTomlMcpConfig(raw, URL, { force: true });
    expect(r.action).toBe('replaced');
    expect(r.text).toContain(`url = "${URL}"`);
    expect(r.text).toContain('enabled = true');
  });
});

describe('removeTomlMcpServer', () => {
  it('removes only the dotodo section', () => {
    const raw = `model = "x"\n\n[mcp_servers.dotodo]\nurl = "${URL}"\n\n[other]\nk = 1\n`;
    const r = removeTomlMcpServer(raw);
    expect(r.action).toBe('removed');
    expect(r.text).toContain('model = "x"');
    expect(r.text).toContain('[other]');
    expect(r.text).not.toContain('[mcp_servers.dotodo]');
  });

  it('deletes file when only that section existed', () => {
    const raw = `[mcp_servers.dotodo]\nurl = "${URL}"\n`;
    const r = removeTomlMcpServer(raw);
    expect(r.action).toBe('deleted-file');
    expect(r.text).toBeNull();
  });
});
