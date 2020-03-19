# setup-haskell

<p align="left">
  <a href="https://github.com/actions/setup-haskell"><img alt="GitHub Actions status" src="https://github.com/actions/setup-haskell/workflows/Main%20workflow/badge.svg"></a>
</p>

This action sets up a Haskell environment for use in actions by taking advantage of [`ghcup`](https://gitlab.haskell.com/ghcup) and [`ghcups`](https://github.com/kakkun61/ghcups):

## Usage

See [action.yml](action.yml)

Basic:

```yaml
steps:
  - uses: actions/checkout@v2
  - uses: actions/setup-haskell@v1
    with:
      ghc-version: '8.8.3' # Exact version of ghc to use
      cabal-version: '3.0.0.0'
  - run: runghc Hello.hs
```

Matrix Testing:

```yaml
jobs:
  build:
    runs-on: ubuntu-16.04
    strategy:
      matrix:
        ghc: ['8.6.5', '8.8.3']
        cabal: ['2.4.1.0', '3.0.0.0']
        exclude:
          # GHC 8.8+ only works with cabal v3+
          - ghc: 8.8.3
            cabal: 2.4.1.0
    name: Haskell GHC ${{ matrix.ghc }} sample
    steps:
      - uses: actions/checkout@v2
      - name: Setup Haskell
        uses: actions/setup-haskell@v1
        with:
          ghc-version: ${{ matrix.ghc }}
          cabal-version: ${{ matrix.cabal }}
      - run: runghc Hello.hs
```

Supported versions of GHC:

- `7.10.3`
- `8.0.2`
- `8.2.2`
- `8.4.1`
- `8.4.2`
- `8.4.3`
- `8.4.4`
- `8.6.1`
- `8.6.2`
- `8.6.3`
- `8.6.4`
- `8.6.5`
- `8.8.1`
- `8.8.2`
- `8.8.3`

Supported versions of Cabal:

- `2.2.0.0`
- `2.4.0.0`
- `2.4.1.0`
- `3.0.0.0`

The full list of available versions of GHC and Cabal are as follows:

- [Linux/macOS - Cabal and GHC](https://gitlab.haskell.org/haskell/ghcup/blob/master/.available-versions)
- [Windows - Cabal](https://chocolatey.org/packages/cabal#versionhistory).
- [Windows - GHC](https://chocolatey.org/packages/ghc#versionhistory)

Note: There are _technically_ some descrepencies here. For example, "8.10.1-alpha1" will work for a ghc version for windows but not for Linux and macOS. For your sanity, I suggest sticking with the version lists above which are supported across all three operating systems.

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).

## Contributions

Contributions are welcome! See the [Contributor's Guide](docs/contributors.md).
