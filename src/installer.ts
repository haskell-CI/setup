import * as core from '@actions/core';
import * as io from '@actions/io';
import {exec} from '@actions/exec';
import * as tc from '@actions/tool-cache';
import {promises as fs} from 'fs';
import * as path from 'path';

export const installCabal = async (version: string): Promise<void> =>
  installTool('Cabal', version);

export const installGHC = async (version: string): Promise<void> =>
  installTool('Ghc', version);

async function installTool(
  tool: 'Cabal' | 'Ghc',
  version: string
): Promise<void> {
  const alreadyCached = tc.find(tool.toLowerCase(), version);
  if (alreadyCached) {
    core.addPath(alreadyCached);
    return;
  }

  let toolPath = '';
  if (process.platform === 'win32') {
    for (const step of ['Install', 'Import']) {
      await exec('powershell', [`${step}-Module`, 'ghcups']);
    }
    for (const step of ['Install', 'Set']) {
      await exec('powershell', [`${step}-${tool}`, version]);
    }
    const t = `${tool.toLowerCase()}.${version}`;
    const p = ['lib', t, 'tools', t, tool === 'Ghc' ? 'bin' : ''];
    toolPath = path.join(process.env.ChocolateyInstall || '', ...p);
  } else {
    const ghcup = await tc.downloadTool(
      'https://gitlab.haskell.org/haskell/ghcup/raw/master/ghcup'
    );
    await fs.chmod(ghcup, 0o755);
    await io.mkdirP(path.join(process.env.HOME || '', '.ghcup', 'bin'));
    await exec(ghcup, [tool === 'Ghc' ? 'install' : 'install-cabal', version]);

    const p = tool === 'Ghc' ? ['ghc', version] : ['bin'];
    toolPath = path.join(process.env.HOME || '', '.ghcup', ...p);
  }

  const cachedTool = await tc.cacheDir(toolPath, tool.toLowerCase(), version);
  core.addPath(cachedTool);
}
