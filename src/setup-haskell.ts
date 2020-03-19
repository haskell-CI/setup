import * as core from '@actions/core';
import {installGHC, installCabal} from './installer';
import {safeLoad} from 'js-yaml';
import {readFileSync} from 'fs';
import {join} from 'path';

const actionYml = safeLoad(
  readFileSync(join(__dirname, '..', 'action.yml'), 'utf8')
);
const defaultGHCVersion = actionYml.inputs['ghc-version'].default;
const defaultCabalVersion = actionYml.inputs['cabal-version'].default;

async function run(): Promise<void> {
  try {
    core.info('Preparing to setup GHC and Cabal');
    const ghcVersion = core.getInput('ghc-version') || defaultGHCVersion;
    core.info(`Installing GHC version ${ghcVersion}`);
    await installGHC(ghcVersion);

    const cabalVersion = core.getInput('cabal-version') || defaultCabalVersion;
    core.info(`Installing Cabal version ${cabalVersion}`);
    await installCabal(cabalVersion);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
