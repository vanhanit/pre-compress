# pre-compress (WIP)
> **_NOTE:_** This is still work in progress. The following information is not accurate.

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

A tool for compressing static assets later served by a web server. This tool can compress files selected by the glob patterns. It can also ignore compressing already compressed files and delete compressed files that was the same size or bigger than the source.

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
  -V, --version           output the version number
  -f, --files <files...>  the files to compress, supports glob patterns to match multiple files
  -d, --delete-larger     delete compressed files that is larger than the source
  -s, --skip-existing     don't compress if the compressed version exist
  -h, --help              display help for command
```
