import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { beforeEach, describe, test } from "node:test";
import { brotliDecompressSync, gunzipSync, zstdDecompressSync } from "node:zlib";
import { run, type Io } from "../src/cli.ts";
import { readPackageInfo } from "../src/package-info.ts";
import { compressible, useTempDir } from "./helpers.ts";

describe("run", () => {
  const dir = useTempDir({ chdir: true });
  let stdout: string[];
  let stderr: string[];
  const io: Io = {
    log: (message) => stdout.push(message),
    error: (message) => stderr.push(message),
    style: (_, text) => text
  };

  beforeEach(() => {
    stdout = [];
    stderr = [];
  });

  test("prints the version", async () => {
    assert.equal(await run(["--version"], io), 0);
    assert.deepEqual(stdout, [readPackageInfo().version]);
  });

  test("prints the usage", async () => {
    assert.equal(await run(["--help"], io), 0);
    assert.match(stdout.join("\n"), /^Usage: pre-compress \[options\]/);
  });

  test("fails with a hint for invalid arguments", async () => {
    assert.equal(await run([], io), 1);
    assert.deepEqual(stderr, [
      "error: required option '-f, --files <files...>' not specified",
      "Run 'pre-compress --help' for usage."
    ]);
  });

  test("writes gzip and brotli files of matching files", async () => {
    await writeFile("app.js", compressible);
    await writeFile("app.css", compressible);

    assert.equal(await run(["--files", "*.js"], io), 0);
    assert.deepEqual((await readdir(dir())).sort(), ["app.css", "app.js", "app.js.br", "app.js.gz"]);
    assert.equal(gunzipSync(await readFile("app.js.gz")).toString(), compressible);
    assert.equal(brotliDecompressSync(await readFile("app.js.br")).toString(), compressible);
    assert.match(stdout.join("\n"), /Compressed file app\.js to app\.js\.gz/);
  });

  test("writes only the selected encodings with --encodings", async () => {
    await writeFile("app.js", compressible);

    assert.equal(await run(["-f", "*.js", "--encodings", "zstd"], io), 0);
    assert.deepEqual((await readdir(dir())).sort(), ["app.js", "app.js.zst"]);
    assert.equal(zstdDecompressSync(await readFile("app.js.zst")).toString(), compressible);
  });

  test("accepts several patterns", async () => {
    await writeFile("app.js", compressible);
    await writeFile("app.css", compressible);

    assert.equal(await run(["-f", "*.js", "*.css"], io), 0);
    assert.deepEqual((await readdir(dir())).sort(), [
      "app.css",
      "app.css.br",
      "app.css.gz",
      "app.js",
      "app.js.br",
      "app.js.gz"
    ]);
  });

  test("does not compress already compressed files", async () => {
    await writeFile("app.js", compressible);

    await run(["-f", "*", "-e", "gzip,brotli,zstd"], io);
    assert.equal(await run(["-f", "*", "-e", "gzip,brotli,zstd"], io), 0);
    assert.deepEqual((await readdir(dir())).sort(), ["app.js", "app.js.br", "app.js.gz", "app.js.zst"]);
  });

  test("keeps up to date compressed files with --skip-existing", async () => {
    await writeFile("app.js", compressible);
    await writeFile("app.js.gz", "existing");

    assert.equal(await run(["-f", "*.js", "--skip-existing"], io), 0);
    assert.equal(await readFile("app.js.gz", "utf8"), "existing");
    assert.match(stdout.join("\n"), /Skipped file app\.js\.gz/);
  });

  test("removes compressed files that are not smaller with --delete-larger", async () => {
    await writeFile("random.bin", randomBytes(64));

    assert.equal(await run(["-f", "*.bin", "--delete-larger"], io), 0);
    assert.deepEqual(await readdir(dir()), ["random.bin"]);
    assert.match(stdout.join("\n"), /Deleted file random\.bin\.gz/);
  });

  test("summarizes what was done to the compressed files", async () => {
    await writeFile("app.js", compressible);
    await writeFile("app.js.gz", "existing");
    await writeFile("random.bin", randomBytes(64));

    assert.equal(await run(["-f", "*", "-ds"], io), 0);
    assert.match(stdout.at(-1) ?? "", /^Processed 2 files in .+: 1 written, 1 skipped, 2 deleted$/);
  });

  test("succeeds when no files match", async () => {
    assert.equal(await run(["-f", "*.js"], io), 0);
    assert.deepEqual(stderr, []);
    assert.match(stdout.at(-1) ?? "", /^Processed 0 files in /);
  });

  test("fails with thrown values that are not errors", async () => {
    const throwing: Io = {
      ...io,
      log: () => {
        throw "unexpected" as unknown;
      }
    };

    assert.equal(await run(["--version"], throwing), 1);
    assert.deepEqual(stderr, ["error: unexpected"]);
  });

  test("fails with the error when compression fails", async () => {
    await writeFile("app.js", compressible);
    await mkdir("app.js.gz");

    assert.equal(await run(["-f", "*.js"], io), 1);
    assert.equal(stderr.length, 1);
    assert.match(stderr[0], /^error: /);
  });
});
