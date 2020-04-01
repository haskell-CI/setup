import * as core from '@actions/core';
import {getOpts, getDefaults} from './opts';
import {exec} from '@actions/exec';

(async () => {
  try {
    const opts = getOpts(getDefaults());
    core.info('Preparing to setup a Haskell environment');
    core.debug(`Options are: ${JSON.stringify(opts)}`);

    for (const [tool, o] of Object.entries(opts)) {
      if (o.enable) {
        core.info(`Installing ${tool} version ${o.version}`);
        await o.install(o.version);
      }
    }

    if (opts.stack.setup) {
      core.startGroup('Pre-installing GHC with stack');
      await exec('stack', ['setup', opts.ghc.version]);
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
  }
})();
