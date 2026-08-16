import { MCP_SERVER_KEY } from '../constants.js';

/**
 * Upsert [mcp_servers.<key>] url = "..." in Codex / Grok config.toml.
 * Does not parse the whole TOML document — only that section.
 *
 * @param {string} raw
 * @param {string} url
 * @param {{ force?: boolean, key?: string }} [opts]
 */
export function mergeTomlMcpConfig(raw, url, opts = {}) {
  const key = opts.key || MCP_SERVER_KEY;
  const force = Boolean(opts.force);
  const text = raw || '';
  const header = `[mcp_servers.${key}]`;
  const existing = extractSection(text, header);

  if (!existing) {
    const block = `${header}\nurl = ${tomlString(url)}\n`;
    const next = text.trimEnd() ? `${text.trimEnd()}\n\n${block}` : block;
    return { text: ensureNl(next), action: text.trim() ? 'added' : 'created' };
  }

  const currentUrl = parseUrlFromSection(existing.body);
  if (currentUrl === url) {
    return { text: ensureNl(text), action: 'unchanged' };
  }

  if (!force && currentUrl) {
    return { text: ensureNl(text), action: 'skipped' };
  }

  const newBody = upsertUrlLine(existing.body, url);
  const next = replaceRange(
    text,
    existing.start,
    existing.end,
    `${header}${newBody}`
  );
  return { text: ensureNl(next), action: currentUrl ? 'replaced' : 'added' };
}

/**
 * Remove [mcp_servers.<key>] section only.
 */
export function removeTomlMcpServer(raw, opts = {}) {
  const key = opts.key || MCP_SERVER_KEY;
  const text = raw || '';
  if (!text.trim()) return { text: null, action: 'unchanged' };
  const header = `[mcp_servers.${key}]`;
  const existing = extractSection(text, header);
  if (!existing) return { text: ensureNl(text), action: 'unchanged' };

  let next = text.slice(0, existing.start) + text.slice(existing.end);
  next = next.replace(/\n{3,}/g, '\n\n').trimEnd();
  if (!next.trim()) return { text: null, action: 'deleted-file' };
  return { text: ensureNl(next), action: 'removed' };
}

/**
 * Find [header] ... until next [section] at column 0.
 */
export function extractSection(text, header) {
  const idx = text.indexOf(header);
  if (idx === -1) return null;
  // header must start at beginning of line
  if (idx > 0 && text[idx - 1] !== '\n') {
    const next = text.indexOf(`\n${header}`);
    if (next === -1) return null;
    return extractSectionFrom(text, next + 1, header);
  }
  return extractSectionFrom(text, idx, header);
}

function extractSectionFrom(text, start, header) {
  const afterHeader = start + header.length;
  const rest = text.slice(afterHeader);
  const nextSection = rest.search(/\n\[[^\]]+\]/);
  const end = nextSection === -1 ? text.length : afterHeader + nextSection;
  const body = text.slice(afterHeader, end);
  return { start, end, body };
}

function parseUrlFromSection(body) {
  const m = body.match(/^\s*url\s*=\s*(.+)$/m);
  if (!m) return null;
  return unquoteToml(m[1].trim());
}

function upsertUrlLine(body, url) {
  const line = `url = ${tomlString(url)}`;
  if (/^\s*url\s*=/m.test(body)) {
    return body.replace(/^\s*url\s*=\s*.+$/m, line);
  }
  const trimmed = body.replace(/^\n+/, '');
  return `\n${line}\n${trimmed}`.replace(/\n+$/, '\n');
}

function replaceRange(text, start, end, insert) {
  return text.slice(0, start) + insert + text.slice(end);
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function unquoteToml(value) {
  const v = value.replace(/\s+#.*$/, '').trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    try {
      return JSON.parse(v.startsWith("'") ? `"${v.slice(1, -1)}"` : v);
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

function ensureNl(s) {
  return s.endsWith('\n') ? s : `${s}\n`;
}
