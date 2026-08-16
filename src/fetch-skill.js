import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { skillTarballUrl, skillZipUrl } from './constants.js';
import { untarGzFiles } from './tar.js';
import { unzipFiles } from './zip.js';

/**
 * Download the skill folder from GitHub (release zip, then repo tarball).
 * @param {{
 *   home?: string,
 *   cacheDir?: string,
 *   ref?: string,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 * @returns {Promise<string>} path to extracted skill dir (contains SKILL.md)
 */
export async function fetchSkill(opts = {}) {
  const envDir = process.env.DOTODO_SKILL_DIR;
  if (envDir && existsSync(path.join(envDir, 'SKILL.md'))) return envDir;

  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw skillFetchError(
      'fetch is not available. Use Node 18+ or set DOTODO_SKILL_DIR.'
    );
  }

  const ref = opts.ref || process.env.DOTODO_SKILL_REF || 'latest';
  const cacheRoot =
    opts.cacheDir ||
    path.join(opts.home || homedir(), '.dotodo', 'cache', 'skills', safeRef(ref));
  const extracted = path.join(cacheRoot, 'dotodo');
  const zipUrl = skillZipUrl(ref);
  const tarUrl = skillTarballUrl(ref);

  let zipErr;
  try {
    const buf = await download(fetchImpl, zipUrl);
    writeSkillFiles(unzipFiles(buf), extracted, fromZipName);
    return extracted;
  } catch (e) {
    zipErr = e;
  }

  let tarErr;
  try {
    const buf = await download(fetchImpl, tarUrl);
    writeSkillFiles(untarGzFiles(buf), extracted, fromTarName);
    return extracted;
  } catch (e) {
    tarErr = e;
  }

  if (existsSync(path.join(extracted, 'SKILL.md'))) {
    console.warn(
      `Using cached skill at ${extracted} (download failed: ${zipErr.message})`
    );
    return extracted;
  }

  throw skillFetchError(
    [
      'Could not download the dotodo skill from GitHub.',
      `Tried zip: ${zipUrl}`,
      `Then tarball: ${tarUrl}`,
      zipErr ? `Zip: ${zipErr.message}` : null,
      tarErr ? `Tarball: ${tarErr.message}` : null,
      'Check your network, or set DOTODO_SKILL_DIR to a local skill folder.',
    ]
      .filter(Boolean)
      .join('\n')
  );
}

async function download(fetchImpl, url) {
  const res = await fetchImpl(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'dotodo-cli' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function writeSkillFiles(files, destDir, mapName) {
  const mapped = [];
  for (const [name, data] of files) {
    const rel = mapName(name);
    if (rel) mapped.push([rel, data]);
  }
  if (!mapped.some(([rel]) => rel === 'SKILL.md')) {
    throw new Error('Downloaded archive has no SKILL.md');
  }

  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  for (const [rel, data] of mapped) {
    const full = path.join(destDir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, data);
  }
}

/** zip: "dotodo/SKILL.md" → "SKILL.md" */
function fromZipName(name) {
  const n = name.replace(/\\/g, '/').replace(/^\.\//, '');
  if (n.startsWith('dotodo/')) return n.slice('dotodo/'.length);
  if (n === 'SKILL.md' || n.startsWith('agents/') || n === 'icon.svg') return n;
  return null;
}

/** tar: "skills-main/skills/dotodo/SKILL.md" → "SKILL.md" */
function fromTarName(name) {
  const n = name.replace(/\\/g, '/');
  const marker = '/skills/dotodo/';
  const idx = n.indexOf(marker);
  if (idx !== -1) return n.slice(idx + marker.length);
  if (n.startsWith('skills/dotodo/')) return n.slice('skills/dotodo/'.length);
  return fromZipName(n);
}

function safeRef(ref) {
  return String(ref).replace(/[^a-zA-Z0-9._-]+/g, '_') || 'latest';
}

function skillFetchError(message) {
  const err = new Error(message);
  err.code = 'SKILL_FETCH';
  return err;
}
