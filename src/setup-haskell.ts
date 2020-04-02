import * as core from '@actions/core';
import {getOpts, getDefaults, Tool} from './opts';
import {installTool} from './installer';
import type {OS} from './opts';
import {exec} from '@actions/exec';

(async () => {
  try {
    core.info('Preparing to setup a Haskell environment');

    const opts = getOpts(getDefaults());
    core.debug(`Options are: ${JSON.stringify(opts)}`);

    for (const [tool, {resolved}] of Object.entries(opts).filter(
      o => o[1].enable
    )) {
      core.startGroup(`Installing ${tool}`);
      core.info(`Installing ${tool} version ${resolved}`);
      await installTool(tool as Tool, resolved, process.platform as OS);
      core.endGroup();
    }

    if (opts.stack.setup) {
      core.startGroup('Pre-installing GHC with stack');
      await exec('stack', ['setup', opts.ghc.resolved]);
      core.endGroup();
    }

    if (opts.cabal.enable) {
      core.startGroup('Setting up cabal');
      await exec('cabal', [
        'user-config',
        'update',
        '-a',
        'http-transport: plain-http',
        '-v3'
      ]);
      await exec('cabal', ['update']);
      core.endGroup();
    }
  } catch (error) {
    core.setFailed(error.message);
    core.endGroup();
  }
})();
