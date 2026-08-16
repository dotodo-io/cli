import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

/**
 * Copy skill tree into dest (overwrite). Skip dotfiles.
 * @returns {{ dest: string, action: 'copied'|'dry-run' }}
 */
export function installSkill(srcDir, destDir, { dryRun = false } = {}) {
  if (!existsSync(path.join(srcDir, 'SKILL.md'))) {
    throw new Error(`SKILL.md missing in ${srcDir}`);
  }
  if (dryRun) {
    return { dest: destDir, action: 'dry-run' };
  }
  mkdirSync(path.dirname(destDir), { recursive: true });
  rmSync(destDir, { recursive: true, force: true });
  cpSync(srcDir, destDir, {
    recursive: true,
    filter: (p) => {
      const base = path.basename(p);
      return !base.startsWith('.') && base !== 'node_modules';
    },
  });
  return { dest: destDir, action: 'copied' };
}

export function uninstallSkill(destDir, { dryRun = false } = {}) {
  if (!existsSync(destDir)) {
    return { dest: destDir, action: 'unchanged' };
  }
  if (dryRun) {
    return { dest: destDir, action: 'dry-run' };
  }
  rmSync(destDir, { recursive: true, force: true });
  return { dest: destDir, action: 'removed' };
}

export function skillInstalled(destDir) {
  return existsSync(path.join(destDir, 'SKILL.md'));
}

export function listSkillFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory())
      out.push(...listSkillFiles(full).map((f) => path.join(name, f)));
    else out.push(name);
  }
  return out;
}
