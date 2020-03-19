import * as core from '@actions/core';
import {installGHC, installCabal} from './installer';
import {safeLoad} from 'js-yaml';
import {readFileSync} from 'fs';
import {join} from 'path';

const actionYml = safeLoad(readFileSync(join('..', 'action.yml'), 'utf8'));
const defaultGHCVersion = actionYml.inputs['ghc-version'].default;
const defaultCabalVersion = actionYml.inputs['cabal-version'].default;

async function run(): Promise<void> {
  try {
    const ghcVersion = core.getInput('ghc-version') || defaultGHCVersion;
    await installGHC(ghcVersion);

    const cabalVersion = core.getInput('cabal-version') || defaultCabalVersion;
    await installCabal(cabalVersion);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
