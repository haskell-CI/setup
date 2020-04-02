import {getOpts, getDefaults} from '../src/opts';
import {getInput} from '@actions/core';

const def = getDefaults();

const environments = {
  empty: {'ghc-version': null, 'cabal-version': null},
  stack: {'stack-version': '2.1.3'},
  stacklatest: {'stack-version': 'latest'},
  stackOnly: {'stack-version': 'latest', 'stack-no-global': 'true'},
  stackOnlyWrong: {'stack-no-global': 'true'},
  stackOnlyWrong2: {'stack-setup-ghc': 'true'},
  resolveVersion: {
    'stack-version': '2.1',
    'ghc-version': '8.6',
    'cabal-version': '2.4'
  }
};

const mkName = (s: string): string =>
  `INPUT_${s.replace(/ /g, '_').toUpperCase()}`;

const setupEnv = (o: Record<string, unknown>): void =>
  Object.entries(o).forEach(([k, v]) => v && (process.env[mkName(k)] = `${v}`));

describe('actions/setup-haskell', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {...OLD_ENV};
    delete process.env.NODE_ENV;
  });

  afterEach(() => (process.env = OLD_ENV));

  it('Parses action.yml to get correct default GHC', () => {
    expect(def.ghc.version).toBe('8.8.3');
  });

  it('Parses action.yml to get correct default Cabal', () => {
    expect(def.cabal.version).toBe('3.0.0.0');
  });

  it('Parses action.yml to get supported versions as an array', () => {
    expect(Array.isArray(def.cabal.supported)).toBe(true);
  });

  it('[meta] Setup Env works', () => {
    setupEnv({input: 'value'});
    const i = getInput('input');
    expect(i).toEqual('value');
  });

  it('getOpts grabs defaults correctly from environment', () => {
    setupEnv(environments.empty);
    const options = getOpts(def);
    expect(options.ghc.exact).toBe(def.ghc.version);
  });

  it('GHC versions resolve correctly', () => {
    setupEnv(environments.resolveVersion);
    const options = getOpts(def);
    expect(options.ghc.resolved).toBe('8.6.5');
  });

  it('Cabal versions resolve correctly', () => {
    setupEnv(environments.resolveVersion);
    const options = getOpts(def);
    expect(options.cabal.resolved).toBe('2.4.1.0');
  });

  it('Stack versions resolve correctly', () => {
    setupEnv(environments.resolveVersion);
    const options = getOpts(def);
    expect(options.stack.resolved).toBe('2.1.3');
  });

  it('Enabling stack does not disable GHC', () => {
    setupEnv(environments.stack);
    const {ghc, stack} = getOpts(def);
    expect({
      ghc: ghc.enable,
      stack: stack.enable
    }).toStrictEqual({ghc: true, stack: true});
  });

  it('Enabling stack-no-global does disable GHC and Cabal', () => {
    setupEnv(environments.stackOnly);
    const {ghc, cabal} = getOpts(def);
    expect({
      ghc: ghc.enable,
      cabal: cabal.enable
    }).toStrictEqual({ghc: false, cabal: false});
  });

  it('Enabling stack-no-global without setting stack-version errors', () => {
    setupEnv(environments.stackOnlyWrong);
    expect(() => getOpts(def)).toThrow();
  });

  it('Enabling stack-setup-ghc without setting stack-version errors', () => {
    setupEnv(environments.stackOnlyWrong2);
    expect(() => getOpts(def)).toThrow();
  });
});
