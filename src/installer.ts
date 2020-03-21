import * as core from '@actions/core';
import * as os from 'os';
import * as io from '@actions/io';
import {exec} from '@actions/exec';
import * as tc from '@actions/tool-cache';
import {promises as fs} from 'fs';
import * as path from 'path';

export const installCabal = async (version: string): Promise<void> =>
  installTool('cabal', version);

export const installGHC = async (version: string): Promise<void> =>
  installTool('ghc', version);

type Tool = 'cabal' | 'ghc';
async function installTool(tool: Tool, version: string): Promise<void> {
  core.startGroup(`Installing ${tool}`);
  // Currently only linux comes pre-installed with some versions of GHC.
  // They're intalled to /opt. Let's see if we can save ourselves a download
  if (process.platform === 'linux') {
    // Cabal is installed to /opt/cabal/x.x but cabal's full version is X.X.Y.Z
    const v = tool === 'cabal' ? version.slice(0, 3) : version;
    try {
      const p = path.join('/opt', tool, v, 'bin');
      await fs.access(p);
      core.debug(`Using pre-installed ${tool} ${version}`);
      core.addPath(p);
      core.endGroup();
      return;
    } catch {
      // oh well, we tried
    }
  }

  if (process.platform === 'win32') {
    const tmp = path.join(process.env['RUNNER_TEMP'] || os.tmpdir(), 'haskell');
    await io.mkdirP(tmp);
    const cmd = ['choco', 'install', tool, '--version', version];
    const flags = ['-m', '-r', '-c', tmp];
    await exec('powershell', cmd.concat(flags));

    const t = `${tool}.${version}`;
    const p = ['lib', t, 'tools', t, tool === 'ghc' ? 'bin' : ''];
    core.addPath(path.join(process.env.ChocolateyInstall || '', ...p));
  } else {
    const ghcup = await tc.downloadTool(
      'https://gitlab.haskell.org/haskell/ghcup/raw/master/ghcup'
    );
    await fs.chmod(ghcup, 0o755);
    await io.mkdirP(path.join(process.env.HOME || '', '.ghcup', 'bin'));
    await exec(ghcup, [tool === 'ghc' ? 'install' : 'install-cabal', version]);

    const p = tool === 'ghc' ? ['ghc', version] : [];
    core.addPath(path.join(process.env.HOME || '', '.ghcup', ...p, 'bin'));
  }
  core.endGroup();
}
