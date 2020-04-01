import * as core from '@actions/core';
import {readFileSync} from 'fs';
import {safeLoad} from 'js-yaml';
import {join} from 'path';
import {installStack, installCabal, installGHC} from './installer';

export interface ProgramOpt {
  enable: boolean;
  version: string;
  install: (version: string) => Promise<void>;
}

export interface Options {
  ghc: ProgramOpt;
  cabal: ProgramOpt;
  stack: ProgramOpt & {setup: boolean};
}

export interface Defaults {
  ghc: {version: string};
  cabal: {version: string};
}

export function getDefaults(): Defaults {
  const actionYml = safeLoad(
    readFileSync(join(__dirname, '..', 'action.yml'), 'utf8')
  );
  return {
    ghc: {version: actionYml.inputs['ghc-version'].default},
    cabal: {version: actionYml.inputs['cabal-version'].default}
  };
}

export function getOpts(def: Defaults): Options {
  const stackNoGlobal = core.getInput('stack-no-global') !== '';
  const stackVersion = core.getInput('stack-version');
  const stackSetupGhc = core.getInput('stack-setup-ghc') !== '';

  const errors = [];
  if (stackNoGlobal && stackVersion === '') {
    errors.push('stack-version is required if stack-no-global is set');
  }

  if (stackSetupGhc && stackVersion === '') {
    errors.push('stack-version is required if stack-setup-ghc is set');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return {
    ghc: {
      version: core.getInput('ghc-version') || def.ghc.version,
      enable: !stackNoGlobal,
      install: installGHC
    },
    cabal: {
      version: core.getInput('cabal-version') || def.cabal.version,
      enable: !stackNoGlobal,
      install: installCabal
    },
    stack: {
      version: stackVersion,
      enable: stackVersion !== '',
      install: installStack,
      setup: core.getInput('stack-setup-ghc') !== ''
    }
  };
}
