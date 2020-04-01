import * as core from '@actions/core';
import {exec} from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import {promises as fs} from 'fs';
import {join} from 'path';

export const installCabal = async (version: string): Promise<void> =>
  installTool('cabal', version);

export const installGHC = async (version: string): Promise<void> =>
  installTool('ghc', version);

export async function installStack(version: string): Promise<void> {
  const info =
    version === 'latest'
      ? 'Installing the latest version'
      : `Installing version ${version}`;
  core.startGroup(`${info} of stack`);
  const platformMap = ({
    linux: 'linux-x86_64-static',
    darwin: 'osx-x86_64',
    win32: 'windows-x86_64'
  } as unknown) as Record<NodeJS.Platform, string>;

  const name = `stack-${version}-${platformMap[process.platform]}`;
  const url =
    version === 'latest'
      ? `get.haskellstack.org/stable/${platformMap[process.platform]}`
      : `github.com/commercialhaskell/stack/releases/download/v${version}/${name}`;

  const stack = await tc.downloadTool(`https://${url}.tar.gz`);
  const p = await tc.extractTar(stack);

  // Less janky than figuring out how to ./p/*/stack. (Not by much)
  const stackPath =
    (await fs.readdir(p, {withFileTypes: true}))
      .flatMap(d => (d.isDirectory() ? [d.name] : []))
      .find(f => f.startsWith('stack')) ?? '';

  const cachedTool = await tc.cacheDir(join(p, stackPath), 'stack', version);
  core.addPath(cachedTool);

  core.endGroup();
}

type Tool = 'cabal' | 'ghc';
async function installTool(tool: Tool, version: string): Promise<void> {
  core.startGroup(`Installing ${tool}`);
  // Linux comes pre-installed with some versions of GHC and supports older
  // versions through hvr's PPA.
  if (process.platform === 'linux') {
    // Cabal is installed to /opt/cabal/x.x but cabal's full version is X.X.Y.Z
    const v = tool === 'cabal' ? version.slice(0, 3) : version;

    const p = join('/opt', tool, v, 'bin');
    const installed = await fs
      .access(p)
      .then(() => true)
      .catch(() => false);

    if (tool === 'ghc' && !installed) {
      // hvr's PPA has better support for GHC < 8.0
      await exec(`sudo -- sh -c "apt-get -y install ghc-${v}"`);
    }

    try {
      await fs.access(p);
      core.addPath(p);
      core.endGroup();
      return;
    } catch {
      // ok, let's try the generic install now
    }
  }

  if (process.platform === 'win32') {
    await exec('powershell', [
      'choco',
      'install',
      tool,
      '--version',
      version,
      '-m',
      '--no-progress',
      '-r'
    ]);

    core.addPath(
      join(
        process.env.ChocolateyInstall || '',
        'lib',
        `${tool}.${version}`,
        'tools',
        `${tool}-${version}`,
        tool === 'ghc' ? 'bin' : ''
      )
    );
  } else {
    const ghcup = await tc.downloadTool(
      'https://raw.githubusercontent.com/haskell/ghcup/master/ghcup'
    );
    await fs.chmod(ghcup, 0o755);
    await io.mkdirP(join(process.env.HOME || '', '.ghcup', 'bin'));
    await exec(ghcup, [tool === 'ghc' ? 'install' : 'install-cabal', version]);

    const p = tool === 'ghc' ? ['ghc', version] : [];
    core.addPath(join(process.env.HOME || '', '.ghcup', ...p, 'bin'));
  }
  core.endGroup();
}
