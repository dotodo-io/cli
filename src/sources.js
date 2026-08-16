import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cliRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function getCliRoot() {
  return cliRoot;
}

export async function getPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.join(cliRoot, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
