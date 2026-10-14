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
every request, see [Serve the compressed files](#serve-the-compressed-files).

- Files that are already compressed (`.gz`, `.br` and `.zst`) are never compressed again.
- Compressed files are written atomically, so a server never sends a partially written file.
- No dependencies, only Node.js built-ins.
- Free to use, also in companies, under the [PolyForm Shield License](#license).

Requires Node.js 22.18 or newer.

## Install

The package is published as `@vanhanit/pre-compress` and installs the `pre-compress` command.

Run it without installing:

```shell
npx @vanhanit/pre-compress --files "dist/**/*.{html,css,js,svg}"
```

Install it globally:

```shell
npm install --global @vanhanit/pre-compress
```

Or add it to a project and compress the build output after each build:

```shell
npm install --save-dev @vanhanit/pre-compress
```

```json
{
  "scripts": {
    "build": "vite build",
    "postbuild": "pre-compress --delete-larger --skip-existing --files \"dist/**/*.{html,css,js,svg}\""
  }
}
```

## Usage

```shell
Usage: pre-compress [options]

Compress static files to be served by a web server.

Options:
  -f, --files <files...>          the files to compress, supports glob patterns to match multiple files
  -e, --encodings <encodings...>  the encodings to write: gzip, brotli, zstd (default: gzip,brotli)
  -d, --delete-larger             delete compressed files that are not smaller than the source
  -s, --skip-existing             don't compress if the compressed version is newer than the source
  -V, --version                   output the version number
  -h, --help                      display help for command
```

Quote the patterns so the shell passes them on unexpanded:

```shell
pre-compress --delete-larger --skip-existing --files "dist/**/*.{html,css,js,svg}"
```

- `--encodings` selects the encodings to write. Add `zstd` to also write a zstandard (`.zst`) version, which recent
  browsers support. The zstd API of Node.js is still experimental.
- `--delete-larger` removes compressed versions that would not save any bytes, so the server sends the source instead.
- `--skip-existing` only compresses files that changed since they were last compressed, which speeds up repeated runs.

The command exits with code 1 when the arguments are invalid or a file cannot be compressed.

## Serve the compressed files

The server must send the compressed file only to browsers that accept its encoding, with the type of the original file,
a `Content-Encoding` header and `Vary: Accept-Encoding` so caches keep one copy per encoding.

### nginx

`gzip_static` is part of nginx and included in the official packages and Docker images. Brotli and zstd need the
third-party modules [ngx_brotli](https://github.com/google/ngx_brotli) and
[zstd-nginx-module](https://github.com/tokers/zstd-nginx-module), which many distributions package, for example as
`libnginx-mod-http-brotli-static` on Debian and Ubuntu.

```nginx
location / {
    gzip_static on;
    brotli_static on;  # ngx_brotli
    zstd_static on;    # zstd-nginx-module
    gzip_vary on;      # also adds Vary: Accept-Encoding for brotli and zstd
    gzip_proxied any;  # gzip_static skips requests from proxies and CDNs (with a Via header) by default
}
```

Leave out the directives of modules you don't have. nginx doesn't weigh the client's preferences between the modules:
when a browser accepts several encodings, the first module that finds a file wins. Brotli files are usually the
smallest, so with nginx, the default gzip and brotli files are enough.

### Caddy

Caddy supports all three encodings without plugins and picks the one the browser prefers, using the listed order when it
has no preference:

```caddyfile
example.com {
    root * /var/www
    file_server {
        precompressed br zstd gzip
    }
}
```

## Benchmark

`npm run bench` serves files with a Node.js server, compressed on every request at the default levels servers use, or
pre-compressed by pre-compress, and measures them under load. These are the results for the minified JavaScript in
`node_modules` (5 files, 231 KiB) with 16 connections, on 4 cores of an Intel Xeon at 2.10 GHz and Node.js 22:

| Encoding | Compressed     | Level | Size    | Requests/s | p50 ms | p99 ms | Server CPU ms/request |
| -------- | -------------- | ----- | ------- | ---------- | ------ | ------ | --------------------- |
| identity | no             | -     | 231 KiB | 11908      | 1.07   | 4.80   | 0.051                 |
| gzip     | on request     | 6     | 61 KiB  | 2797       | 5.25   | 12.19  | 1.168                 |
| gzip     | pre-compressed | 9     | 61 KiB  | 18058      | 0.76   | 2.90   | 0.033                 |
| br       | on request     | 6     | 57 KiB  | 1793       | 8.10   | 19.90  | 1.868                 |
| br       | pre-compressed | 11    | 53 KiB  | 17892      | 0.76   | 2.93   | 0.035                 |
| zstd     | on request     | 3     | 63 KiB  | 3351       | 3.98   | 25.87  | 0.865                 |
| zstd     | pre-compressed | 19    | 56 KiB  | 16565      | 0.80   | 3.02   | 0.036                 |

Pre-compressed brotli files are 77% smaller than the originals and 7% smaller than brotli compressed on request, because
the highest quality is too slow to use on every request. The server answers 10 times more requests than when it
compresses with brotli, with 50 times less CPU per request, and even more than without compression, since it sends
fewer bytes. Compressing the files once took 0.2 seconds.

Pass options and your own files to measure them:

```shell
npm run bench -- --duration 10 --connections 64 "dist/**/*.{html,css,js}"
```

## Development

```shell
npm ci
npm run check  # lint, formatting, type check and tests
npm run build  # compile to dist/
```

## License

pre-compress is licensed under the [PolyForm Shield License 1.0.0](LICENSE). You may use it for any purpose, also in
commercial projects and companies of any size, and you may fork, change and redistribute it. You may not use it to
provide a product that competes with it, such as selling pre-compress or a service built on it.

For a commercial license without these limits, contact [@vanhanit](https://github.com/vanhanit).

Contributions are welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).

Version 1.0.0 was published under the MIT License.
