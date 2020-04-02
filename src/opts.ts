import * as core from '@actions/core';
import {readFileSync} from 'fs';
import {safeLoad} from 'js-yaml';
import {join} from 'path';
import * as supported_versions from './versions.json';

export type OS = 'linux' | 'darwin' | 'win32';
export type Tool = 'cabal' | 'ghc' | 'stack';

export interface ProgramOpt {
  enable: boolean;
  exact: string;
  resolved: string;
}

export interface Options {
  ghc: ProgramOpt;
  cabal: ProgramOpt;
  stack: ProgramOpt & {setup: boolean};
}

export type Defaults = Record<Tool, {version: string; supported: string[]}>;

export function getDefaults(): Defaults {
  const actionYml = safeLoad(
    readFileSync(join(__dirname, '..', 'action.yml'), 'utf8')
  );
  return {
    ghc: {
      version: actionYml.inputs['ghc-version'].default,
      supported: supported_versions.ghc
    },
    cabal: {
      version: actionYml.inputs['cabal-version'].default,
      supported: supported_versions.cabal
    },
    stack: {
      version: 'latest',
      supported: supported_versions.stack
    }
  };
}

function resolve(version: string, supported: string[]): string {
  const ver =
    version === 'latest'
      ? supported[0]
      : supported.find(v => v.startsWith(version)) ?? version;

  core.info(`Resolved ${version} to ${ver}`);
  return ver;
}

export function getOpts({ghc, cabal, stack}: Defaults): Options {
  const stackNoGlobal = core.getInput('stack-no-global') !== '';
  const stackSetupGhc = core.getInput('stack-setup-ghc') !== '';
  const verInpt = {
    ghc: core.getInput('ghc-version') || ghc.version,
    cabal: core.getInput('cabal-version') || cabal.version,
    stack: core.getInput('stack-version')
  };

  const errors = [];
  if (stackNoGlobal && verInpt.stack === '') {
    errors.push('stack-version is required if stack-no-global is set');
  }

  if (stackSetupGhc && verInpt.stack === '') {
    errors.push('stack-version is required if stack-setup-ghc is set');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return {
    ghc: {
      exact: verInpt.ghc,
      resolved: resolve(verInpt.ghc, ghc.supported),
      enable: !stackNoGlobal
    },
    cabal: {
      exact: verInpt.cabal,
      resolved: resolve(verInpt.cabal, cabal.supported),
      enable: !stackNoGlobal
    },
    stack: {
      exact: verInpt.stack,
      resolved: resolve(verInpt.stack, stack.supported),
      enable: verInpt.stack !== '',
      setup: core.getInput('stack-setup-ghc') !== ''
    }
  };
}
