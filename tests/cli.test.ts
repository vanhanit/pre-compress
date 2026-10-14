import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const entry = fileURLToPath(new URL("../bin/index.ts", import.meta.url));
const compressible = "hello world ".repeat(200);

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function cli(cwd: string, ...args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [entry, ...args], { cwd });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const { code, stdout, stderr } = error as { code: number; stdout: string; stderr: string };
    return { code, stdout, stderr };
  }
}

describe("cli", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("prints the version", async () => {
    const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      version: string;
    };

    const result = await cli(dir, "--version");

    assert.equal(result.code, 0);
    assert.equal(result.stdout.trim(), version);
  });

  test("prints the usage", async () => {
    const result = await cli(dir, "--help");

    assert.equal(result.code, 0);
    assert.match(result.stdout, /--files/);
    assert.match(result.stdout, /--delete-larger/);
    assert.match(result.stdout, /--skip-existing/);
  });

  test("fails without files", async () => {
    const result = await cli(dir);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /--files/);
  });

  test("writes gzip and brotli files of matching files", async () => {
    await writeFile(join(dir, "app.js"), compressible);
    await writeFile(join(dir, "app.css"), compressible);

    const result = await cli(dir, "--files", "*.js");

    assert.equal(result.code, 0);
    assert.deepEqual((await readdir(dir)).sort(), ["app.css", "app.js", "app.js.br", "app.js.gz"]);
    assert.equal(gunzipSync(await readFile(join(dir, "app.js.gz"))).toString(), compressible);
    assert.equal(brotliDecompressSync(await readFile(join(dir, "app.js.br"))).toString(), compressible);
  });

  test("accepts several patterns", async () => {
    await writeFile(join(dir, "app.js"), compressible);
    await writeFile(join(dir, "app.css"), compressible);

    const result = await cli(dir, "-f", "*.js", "*.css");

    assert.equal(result.code, 0);
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
    await writeFile(join(dir, "app.js"), compressible);

    await cli(dir, "-f", "*");
    const result = await cli(dir, "-f", "*");

    assert.equal(result.code, 0);
    assert.deepEqual((await readdir(dir)).sort(), ["app.js", "app.js.br", "app.js.gz"]);
  });

  test("keeps existing compressed files with --skip-existing", async () => {
    await writeFile(join(dir, "app.js"), compressible);
    await writeFile(join(dir, "app.js.gz"), "existing");

    const result = await cli(dir, "-f", "*.js", "--skip-existing");

    assert.equal(result.code, 0);
    assert.equal(await readFile(join(dir, "app.js.gz"), "utf8"), "existing");
    assert.equal(brotliDecompressSync(await readFile(join(dir, "app.js.br"))).toString(), compressible);
  });

  test("removes compressed files that are not smaller with --delete-larger", async () => {
    await writeFile(join(dir, "random.bin"), randomBytes(64));

    const result = await cli(dir, "-f", "*.bin", "--delete-larger");

    assert.equal(result.code, 0);
    assert.deepEqual(await readdir(dir), ["random.bin"]);
  });
});
