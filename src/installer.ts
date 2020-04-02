import * as core from '@actions/core';
import {exec} from '@actions/exec';
import {create as glob} from '@actions/glob';
import * as tc from '@actions/tool-cache';
import {promises as fs} from 'fs';
import {join} from 'path';
import type {OS, Tool} from './opts';

function failed(tool: Tool, version: string): void {
  const msg = `All install methods for ${tool} ${version} failed`;
  core.setFailed(msg);
  throw new Error(msg);
}

function warn(tool: Tool, version: string): void {
  const policy = ({
    cabal: `the two latest major releases of ${tool} are commonly supported.`,
    ghc: `the three latest major releases of ${tool} are commonly supported.`,
    stack: `the latest release of ${tool} is commonly supported.`
  } as Record<Tool, string>)[tool];

  core.warning(
    `${tool} ${version} was not found in the cache. It will be downloaded.\n` +
      `If this is unexpected, please check if version ${version} is pre-installed.\n` +
      `The list of pre-installed versions is available here: https://help.github.com/en/actions/reference/software-installed-on-github-hosted-runners\n` +
      `The above list follows a common haskell convention that ${policy}\n` +
      'If the list is outdated, please file an issue here: https://github.com/actions/virtual-environments\n' +
      'by using the appropriate tool request template: https://github.com/actions/virtual-environments/issues/new/choose'
  );
}

async function checkInstalled(
  tool: Tool,
  version: string,
  path?: string
): Promise<boolean> {
  const installedPath =
    tc.find(tool, version) ||
    (await fs
      .access(`${path}`)
      .then(() => path)
      .catch());

  if (installedPath) {
    core.addPath(installedPath);
    core.info(`Found in cache: ${tool} ${version}. Setup successful.`);
  }

  return !!installedPath;
}

export async function installTool(
  tool: Tool,
  version: string,
  os: OS
): Promise<void> {
  if (await checkInstalled(tool, version)) return;

  if (tool === 'stack') {
    warn(tool, version);
    return void (await stack(version, os)) || failed(tool, version);
  }

  let v;
  switch (os) {
    case 'linux':
      // Cabal is installed to /opt/cabal/x.x but cabal's full version is X.X.Y.Z
      v = tool === 'cabal' ? version.slice(0, 3) : version;
      if (await checkInstalled(tool, v, join('/opt', tool, v, 'bin'))) return;
      warn(tool, v);
      if ((await apt(tool, v)) || (await ghcup(tool, version))) return;
      break;
    case 'win32':
      warn(tool, version);
      if (await choco(tool, version)) return;
      break;
    case 'darwin':
      warn(tool, version);
      if (await ghcup(tool, version)) return;
      break;
  }
  return failed(tool, version);
}

async function stack(version: string, os: OS): Promise<boolean> {
  core.info(`Attempting to install stack ${version}`);
  const build = {
    linux: 'linux-x86_64-static',
    darwin: 'osx-x86_64',
    win32: 'windows-x86_64'
  }[os];

  const url =
    version === 'latest'
      ? `https://get.haskellstack.org/stable/${build}.tar.gz`
      : `https://github.com/commercialhaskell/stack/releases/download/v${version}/stack-${version}-${build}.tar.gz`;
  const p = await tc.downloadTool(`${url}`).then(tc.extractTar);
  const [stackPath] = await glob(`${p}/stack*`, {
    implicitDescendants: false
  }).then(async g => g.glob());
  const path = await tc.cacheDir(stackPath, 'stack', version);

  if (await checkInstalled('stack', version, path)) return true;
  core.info(`stack ${version} could not be installed.`);
  return false;
}

async function apt(tool: Tool, version: string): Promise<boolean> {
  core.info(`Attempting to install ${tool} ${version} using apt-get`);

  const toolName = tool === 'ghc' ? 'ghc' : 'cabal-install';
  await exec(`sudo -- sh -c "apt-get -y install ${toolName}-${version}"`);

  if (await checkInstalled(tool, version, `/opt/${tool}/${version}/bin`))
    return true;
  core.info(`${tool} ${version} could not be installed with apt-get.`);
  return false;
}

async function choco(tool: Tool, version: string): Promise<boolean> {
  core.info(`Attempting to install ${tool} ${version} using chocolatey`);

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

  if (await checkInstalled(tool, version)) return true;
  core.info(`${tool} ${version} could not be installed with chocolatey.`);
  return false;
}

async function ghcup(tool: Tool, version: string): Promise<boolean> {
  core.info(`Attempting to install ${tool} ${version} using ghcup`);

  const url = 'https://raw.githubusercontent.com/haskell/ghcup/master/ghcup';
  const bin =
    tc.find('ghcup', '1.0.0') ||
    (await tc.cacheFile(await tc.downloadTool(url), 'ghcup', 'ghcup', '1.0.0'));

  await exec(bin, [tool === 'ghc' ? 'install' : 'install-cabal', version]);
  if (tool === 'ghc') await exec(bin, ['set', version]);

  if (await checkInstalled(tool, version, `${process.env.HOME}/.ghcup/bin`))
    return true;
  core.info(`${tool} ${version} could not be installed with ghcup.`);
  return false;
}
