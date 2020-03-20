import * as core from '@actions/core';
import * as io from '@actions/io';
import {exec} from '@actions/exec';
import * as tc from '@actions/tool-cache';
import {promises as fs} from 'fs';
import * as path from 'path';

export const installCabal = async (version: string): Promise<void> =>
  installTool('cabal', version);

export const installGHC = async (version: string): Promise<void> =>
  installTool('ghc', version);

async function installTool(
  tool: 'cabal' | 'ghc',
  version: string
): Promise<void> {
  const alreadyCached = tc.find(tool, version);
  if (alreadyCached !== '') {
    core.addPath(alreadyCached);
    return;
  }

  let toolPath = '';
  if (process.platform === 'win32') {
    await exec('powershell', [
      'choco',
      'install',
      tool,
      '--version',
      version,
      '--side-by-side'
    ]);
    toolPath = path.join(
      process.env.ChocolateyInstall || '',
      'lib',
      `${tool}.${version}`,
      'tools',
      `${tool}-${version}`,
      tool === 'ghc' ? 'bin' : ''
    );
  } else {
    const ghcup = await tc.downloadTool(
      'https://gitlab.haskell.org/haskell/ghcup/raw/master/ghcup'
    );
    await fs.chmod(ghcup, 0o755);
    await io.mkdirP(path.join(process.env.HOME || '', '.ghcup', 'bin'));
    await exec(ghcup, [tool === 'ghc' ? 'install' : 'install-cabal', version]);

    const p = tool === 'ghc' ? ['ghc', version] : [];
    toolPath = path.join(process.env.HOME || '', '.ghcup', ...p, 'bin');
  }

  const cachedTool = await tc.cacheDir(toolPath, tool, version);
  const verifyCached = tc.find(tool, version);

  if (verifyCached === '' || verifyCached !== cachedTool) {
    core.warning(`Was not able to cache install of ${tool}`);
    core.warning(`This may cause extraneous re-downloads`);
  } else {
    toolPath = verifyCached;
    core.debug(`installed ${tool} to ${toolPath}`);
  }

  core.addPath(toolPath);
}
