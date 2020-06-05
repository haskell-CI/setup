import * as core from '@actions/core';
import * as fs from 'fs';
import {getOpts, getDefaults, Tool} from './opts';
import {installTool} from './installer';
import type {OS} from './opts';
import {exec} from '@actions/exec';

async function cabalConfig(): Promise<string> {
  let out = Buffer.from('');
  const append = (b: Buffer): Buffer => (out = Buffer.concat([out, b]));
  await exec('cabal', ['--help'], {
    silent: true,
    listeners: {stdout: append, stderr: append}
  });
  const file = out.toString();
  core.info(`file is ${file}`);
  return file.split('\n').slice(-1)[0].trim();
}

(async () => {
  try {
    core.info('Preparing to setup a Haskell environment');
    const opts = getOpts(getDefaults());

    for (const [t, {resolved}] of Object.entries(opts).filter(o => o[1].enable))
      await core.group(`Installing ${t} version ${resolved}`, async () =>
        installTool(t as Tool, resolved, process.platform as OS)
      );

    if (opts.stack.setup)
      await core.group('Pre-installing GHC with stack', async () =>
        exec('stack', ['setup', opts.ghc.resolved])
      );

    if (opts.cabal.enable)
      await core.group('Setting up cabal', async () => {
        await exec('cabal', ['user-config', 'update'], {silent: true});
        const configFile = await cabalConfig();
        core.info(`the config file is: ${configFile}`);
        fs.appendFileSync(configFile, 'http-transport: plain-http\n');

        if (process.platform === 'win32') {
          fs.appendFileSync(configFile, 'store-dir: C:\\sr\n');
          core.setOutput('cabal-store', 'C:\\sr');
        } else {
          core.setOutput('cabal-store', `${process.env.HOME}/.cabal/store`);
        }

        await exec('cabal user-config update');
        if (!opts.stack.enable) await exec('cabal update');
      });
  } catch (error) {
    core.setFailed(error.message);
  }
})();
