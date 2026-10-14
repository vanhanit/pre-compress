import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { run } from "../src/cli.ts";
import { readPackageInfo } from "../src/package-info.ts";

const compressible = "hello world ".repeat(200);

describe("run", () => {
  const cwd = process.cwd();
  let dir: string;
  let stdout: string[];
  let stderr: string[];
  const io = {
    log: (message: string) => stdout.push(message),
    error: (message: string) => stderr.push(message)
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
    process.chdir(dir);
    stdout = [];
    stderr = [];
  });

  afterEach(async () => {
    process.chdir(cwd);
    await rm(dir, { recursive: true, force: true });
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
    assert.deepEqual((await readdir(dir)).sort(), ["app.css", "app.js", "app.js.br", "app.js.gz"]);
    assert.equal(gunzipSync(await readFile("app.js.gz")).toString(), compressible);
    assert.equal(brotliDecompressSync(await readFile("app.js.br")).toString(), compressible);
    assert.match(stdout.join("\n"), /Compressed file app\.js to app\.js\.gz/);
  });

  test("accepts several patterns", async () => {
    await writeFile("app.js", compressible);
    await writeFile("app.css", compressible);

    assert.equal(await run(["-f", "*.js", "*.css"], io), 0);
    assert.deepEqual((await readdir(dir)).sort(), [
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

    await run(["-f", "*"], io);
    assert.equal(await run(["-f", "*"], io), 0);
    assert.deepEqual((await readdir(dir)).sort(), ["app.js", "app.js.br", "app.js.gz"]);
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
    assert.deepEqual(await readdir(dir), ["random.bin"]);
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
    const throwing = {
      log: () => {
        throw "unexpected" as unknown;
      },
      error: io.error
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
