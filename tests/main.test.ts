import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readPackageInfo } from "../src/package-info.ts";

const entry = fileURLToPath(new URL("../src/main.ts", import.meta.url));

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function cli(cwd: string, ...args: string[]): Promise<CliResult> {
  try {
    const env = { ...process.env, FORCE_COLOR: undefined };
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [entry, ...args], { cwd, env });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const { code, stdout, stderr } = error as CliResult;
    return { code, stdout, stderr };
  }
}

describe("main", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("prints the version", async () => {
    const result = await cli(dir, "--version");

    assert.equal(result.code, 0);
    assert.equal(result.stdout.trim(), readPackageInfo().version);
  });

  test("compresses files without coloring output that is not a terminal", async () => {
    await writeFile(join(dir, "app.js"), "hello world ".repeat(200));

    const result = await cli(dir, "-f", "*.js");

    assert.equal(result.code, 0);
    assert.deepEqual((await readdir(dir)).sort(), ["app.js", "app.js.br", "app.js.gz"]);
    assert.match(result.stdout, /app\.js\.gz/);
    assert.ok(!result.stdout.includes("\u001b["), "output contains color codes");
  });

  test("exits with 1 on errors", async () => {
    const result = await cli(dir, "--unknown");

    assert.equal(result.code, 1);
    assert.match(result.stderr, /--unknown/);
  });
});
