import * as io from '@actions/io';
import * as fs from 'fs';
import * as path from 'path';

const toolDir = path.join(__dirname, 'runner', 'tools');

process.env['AGENT_TOOLSDIRECTORY'] = toolDir;
process.env['RUNNER_TOOL_CACHE'] = toolDir;

import {installGHC, installCabal} from '../src/installer';
import {safeLoad} from 'js-yaml';

describe('haskell-ci/setup-haskell', () => {
  it('Parses action.yml to get correct default GHC', async () => {
    const actionYml = safeLoad(
      fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8')
    );
    expect(actionYml.inputs['ghc-version'].default).toBe('8.8.3');
  });

  it('Parses action.yml to get correct default Cabal', async () => {
    const actionYml = safeLoad(
      fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8')
    );
    expect(actionYml.inputs['cabal-version'].default).toBe('3.0.0.0');
  });
});
