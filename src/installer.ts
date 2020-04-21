import * as core from '@actions/core';
import {exec} from '@actions/exec';
import {which} from '@actions/io';
import {create as glob} from '@actions/glob';
import * as tc from '@actions/tool-cache';
import {promises as fs} from 'fs';
import {join} from 'path';
import type {OS, Tool} from './opts';

function failed(tool: Tool, version: string): void {
  throw new Error(`All install methods for ${tool} ${version} failed`);
}

async function success(
  tool: Tool,
  version: string,
  path: string
): Promise<true> {
  core.addPath(path);
  core.setOutput(`${tool}-path`, path);
  core.setOutput(`${tool}-exe`, await which(tool));
  core.info(
    `Found ${tool} ${version} in cache at path ${path}. Setup successful.`
  );
  return true;
}

function warn(tool: Tool, version: string): void {
  const policy = {
    cabal: `the two latest major releases of ${tool} are commonly supported.`,
    ghc: `the three latest major releases of ${tool} are commonly supported.`,
    stack: `the latest release of ${tool} is commonly supported.`
  }[tool];

  core.warning(
    `${tool} ${version} was not found in the cache. It will be downloaded.\n` +
      `If this is unexpected, please check if version ${version} is pre-installed.\n` +
      `The list of pre-installed versions is available here: https://help.github.com/en/actions/reference/software-installed-on-github-hosted-runners\n` +
      `The above list follows a common haskell convention that ${policy}\n` +
      'If the list is outdated, please file an issue here: https://github.com/actions/virtual-environments\n' +
      'by using the appropriate tool request template: https://github.com/actions/virtual-environments/issues/new/choose'
  );
}

async function isInstalled(
  tool: Tool,
  version: string,
  os: OS
): Promise<boolean> {
  const toolPath = tc.find(tool, version);
  if (toolPath) return success(tool, version, toolPath);

  const stackPath =
    os === 'win32'
      ? join(`${process.env.APPDATA}`, 'local', 'bin')
      : `${process.env.HOME}/.local/bin`;

  const ghcupPath = `${process.env.HOME}/.ghcup/bin`;

  const v = tool === 'cabal' ? version.slice(0, 3) : version;
  const aptPath = `/opt/${tool}/${v}/bin`;

  const chocoPath = join(
    `${process.env.ChocolateyInstall}`,
    'lib',
    `${tool}.${version}`,
    'tools',
    `${tool}-${version}`,
    tool === 'ghc' ? 'bin' : ''
  );

  const locations = {
    stack: [stackPath],
    cabal: {
      win32: [chocoPath],
      linux: [aptPath, ghcupPath],
      darwin: [ghcupPath]
    }[os],
    ghc: {
      win32: [chocoPath],
      linux: [aptPath, ghcupPath],
      darwin: [ghcupPath]
    }[os]
  };

  for (const p of locations[tool]) {
    const installedPath = await fs
      .access(p || '')
      .then(() => p)
      .catch(() => undefined);

    if (installedPath && (await which(tool)))
      return success(tool, version, installedPath);
  }

  return false;
}

export async function installTool(
  tool: Tool,
  version: string,
  os: OS
): Promise<void> {
  if (await isInstalled(tool, version, os)) return;
  warn(tool, version);

  if (tool === 'stack') {
    await stack(version, os);
    if (await isInstalled(tool, version, os)) return;
    return failed(tool, version);
  }

  switch (os) {
    case 'linux':
      await apt(tool, version);
      if (await isInstalled(tool, version, os)) return;
      await ghcup(tool, version, os);
      break;
    case 'win32':
      await choco(tool, version);
      break;
    case 'darwin':
      await ghcup(tool, version, os);
      break;
  }

  if (await isInstalled(tool, version, os)) return;
  return failed(tool, version);
}

async function stack(version: string, os: OS): Promise<void> {
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
  await tc.cacheDir(stackPath, 'stack', version);

  if (os === 'win32') core.exportVariable('STACK_ROOT', 'C:\\sr');
}

async function apt(tool: Tool, version: string): Promise<void> {
  const toolName = tool === 'ghc' ? 'ghc' : 'cabal-install';
  const v = tool === 'cabal' ? version.slice(0, 3) : version;
  core.info(`Attempting to install ${toolName} ${v} using apt-get`);
  await exec(`sudo -- sh -c "apt-get -y install ${toolName}-${v}"`);
}

async function choco(tool: Tool, version: string): Promise<void> {
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
}

async function ghcup(tool: Tool, version: string, os: OS): Promise<void> {
  core.info(`Attempting to install ${tool} ${version} using ghcup`);

  const bin = await tc.downloadTool(
    `https://downloads.haskell.org/~ghcup/x86_64-${
      os === 'darwin' ? 'apple-darwin' : 'linux'
    }-ghcup`
  );
  await fs.chmod(bin, 0o755);

  await exec(bin, [tool === 'ghc' ? 'install' : 'install-cabal', version]);
  if (tool === 'ghc') await exec(bin, ['set', version]);
}
