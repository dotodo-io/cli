import { parseArgs, printHelp } from './args.js';
import { runInstall, printInstallReport } from './install.js';
import { runUninstall, printUninstallReport } from './uninstall.js';
import { runStatus, printStatus } from './status.js';
import { getPackageVersion } from './sources.js';

export async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    if (e.code === 'USAGE') {
      console.error(e.message);
      printHelp();
      process.exitCode = 2;
      return;
    }
    throw e;
  }

  if (opts.command === 'help') {
    printHelp();
    return;
  }
  if (opts.command === 'version') {
    console.log(await getPackageVersion());
    return;
  }

  if (opts.command === 'install' || opts.command === 'update') {
    const result = await runInstall(opts);
    printInstallReport(result, { dryRun: opts.dryRun, command: opts.command });
    return;
  }

  if (opts.command === 'uninstall') {
    const result = runUninstall(opts);
    printUninstallReport(result, { dryRun: opts.dryRun });
    return;
  }

  if (opts.command === 'status') {
    printStatus(runStatus(opts));
  }
}
