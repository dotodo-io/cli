import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';

describe('cli main', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints help', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main(['help']);
    expect(log.mock.calls.join('\n')).toMatch(/dotodo CLI/);
  });

  it('prints version', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main(['version']);
    expect(log.mock.calls[0][0]).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('exits 2 on usage error', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await main(['install', '--nope']);
    expect(err.mock.calls[0][0]).toMatch(/Unknown flag/);
    expect(process.exitCode).toBe(2);
    process.exitCode = 0;
  });
});
