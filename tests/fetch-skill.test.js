import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fetchSkill } from '../src/fetch-skill.js';
import { DEFAULT_SKILL_ZIP_URL, skillTarballUrl } from '../src/constants.js';
import { makeSkillTarball, makeSkillZip } from './helpers/archives.js';

const FILES = {
  'SKILL.md': '# from-github\n',
  'icon.svg': '<svg />\n',
  'agents/openai.yaml': 'name: dotodo\n',
};

function tmpDir() {
  return path.join(
    os.tmpdir(),
    `dotodo-fetch-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function jsonResponse(status, body, contentType = 'application/octet-stream') {
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () =>
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    headers: { get: () => contentType },
  };
}

describe('fetchSkill', () => {
  /** @type {string[]} */
  const dirs = [];
  afterEach(() => {
    delete process.env.DOTODO_SKILL_DIR;
    delete process.env.DOTODO_SKILL_REF;
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
    dirs.length = 0;
  });

  it('extracts skill.zip from the latest release URL', async () => {
    const cacheDir = tmpDir();
    dirs.push(cacheDir);
    const zip = makeSkillZip(FILES);
    const seen = [];
    const fetchImpl = async (url) => {
      seen.push(url);
      if (url === DEFAULT_SKILL_ZIP_URL) return jsonResponse(200, zip);
      return jsonResponse(404, Buffer.from('no'));
    };

    const dest = await fetchSkill({ cacheDir, fetchImpl });
    expect(seen[0]).toBe(DEFAULT_SKILL_ZIP_URL);
    expect(readFileSync(path.join(dest, 'SKILL.md'), 'utf8')).toBe(
      '# from-github\n'
    );
    expect(existsSync(path.join(dest, 'agents', 'openai.yaml'))).toBe(true);
  });

  it('falls back to the repo tarball when zip fails', async () => {
    const cacheDir = tmpDir();
    dirs.push(cacheDir);
    const tar = makeSkillTarball(FILES);
    const fetchImpl = async (url) => {
      if (url === DEFAULT_SKILL_ZIP_URL) return jsonResponse(404, Buffer.from('no'));
      if (url === skillTarballUrl('latest')) return jsonResponse(200, tar);
      return jsonResponse(500, Buffer.from('no'));
    };

    const dest = await fetchSkill({ cacheDir, fetchImpl });
    expect(readFileSync(path.join(dest, 'SKILL.md'), 'utf8')).toBe(
      '# from-github\n'
    );
  });

  it('uses cache when both downloads fail', async () => {
    const cacheDir = tmpDir();
    dirs.push(cacheDir);
    const zip = makeSkillZip(FILES);
    const okFetch = async (url) =>
      url === DEFAULT_SKILL_ZIP_URL
        ? jsonResponse(200, zip)
        : jsonResponse(404, Buffer.from('no'));
    await fetchSkill({ cacheDir, fetchImpl: okFetch });

    const dest = await fetchSkill({
      cacheDir,
      fetchImpl: async () => jsonResponse(503, Buffer.from('down')),
    });
    expect(readFileSync(path.join(dest, 'SKILL.md'), 'utf8')).toBe(
      '# from-github\n'
    );
  });

  it('throws a clear error when download and cache are missing', async () => {
    const cacheDir = tmpDir();
    dirs.push(cacheDir);
    await expect(
      fetchSkill({
        cacheDir,
        fetchImpl: async () => jsonResponse(503, Buffer.from('down')),
      })
    ).rejects.toThrow(/Could not download the dotodo skill/);
  });

  it('never calls GitHub when DOTODO_SKILL_DIR is set', async () => {
    const home = tmpDir();
    dirs.push(home);
    const skillDir = path.join(home, 'local');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '# local\n');
    process.env.DOTODO_SKILL_DIR = skillDir;

    const dest = await fetchSkill({
      cacheDir: path.join(home, 'cache'),
      fetchImpl: async () => {
        throw new Error('network');
      },
    });
    expect(dest).toBe(skillDir);
  });
});
