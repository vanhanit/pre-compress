# pre-compress

[![CI](https://github.com/vanhanit/pre-compress/actions/workflows/main.yml/badge.svg)](https://github.com/vanhanit/pre-compress/actions/workflows/main.yml)
[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vanhanit_pre-compress)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=bugs)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=code_smells)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=coverage)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=duplicated_lines_density)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=ncloc)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=security_rating)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=vanhanit_pre-compress&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=vanhanit_pre-compress)

> Compress static files to be served by a web server.

pre-compress writes a gzip (`.gz`) and a brotli (`.br`) version next to each file matched by the glob patterns, using
the highest compression levels. A web server can then send the compressed file from disk instead of compressing it on
every request, for example with `gzip_static` and `brotli_static` in nginx.

- Files that are already compressed (`.gz` and `.br`) are never compressed again.
- Compressed files are written atomically, so a server never sends a partially written file.
- No dependencies, only Node.js built-ins.

Requires Node.js 22.18 or newer.

## Install

### Globally

`npm install -g pre-compress`

### Locally to `devDependencies`

`npm install --save-dev pre-compress`

## Usage

```shell
Usage: pre-compress [options]

Compress static files to be served by a web server.

Options:
  -f, --files <files...>  the files to compress, supports glob patterns to match multiple files
  -d, --delete-larger     delete compressed files that are not smaller than the source
  -s, --skip-existing     don't compress if the compressed version is newer than the source
  -V, --version           output the version number
  -h, --help              display help for command
```

Quote the patterns so the shell passes them on unexpanded:

```shell
pre-compress --delete-larger --skip-existing --files "dist/**/*.{html,css,js,svg}"
```

- `--delete-larger` removes compressed versions that would not save any bytes, so the server sends the source instead.
- `--skip-existing` only compresses files that changed since they were last compressed, which speeds up repeated runs.

The command exits with code 1 when the arguments are invalid or a file cannot be compressed.

## Development

```shell
npm ci
npm run check  # lint, formatting, type check and tests
npm run build  # compile to dist/
```
