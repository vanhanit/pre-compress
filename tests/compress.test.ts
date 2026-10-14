import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { compressFile, isCompressed } from "../src/compress.ts";

const compressible = "hello world ".repeat(200);
const keep = { deleteLarger: false, skipExisting: false };

describe("compressFile", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
    file = join(dir, "app.js");
    await writeFile(file, compressible);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("writes gzip and brotli files that decompress to the source", async () => {
    const result = await compressFile(file, keep);

    const gz = await readFile(`${file}.gz`);
    const br = await readFile(`${file}.br`);
    assert.deepEqual(result, {
      file,
      size: compressible.length,
      outputs: [
        { file: `${file}.gz`, status: "written", size: gz.length },
        { file: `${file}.br`, status: "written", size: br.length }
      ]
    });
    assert.equal(gunzipSync(gz).toString(), compressible);
    assert.equal(brotliDecompressSync(br).toString(), compressible);
    assert.deepEqual((await readdir(dir)).sort(), ["app.js", "app.js.br", "app.js.gz"]);
  });

  test("overwrites existing compressed files", async () => {
    await writeFile(`${file}.gz`, "outdated");

    await compressFile(file, keep);

    assert.equal(gunzipSync(await readFile(`${file}.gz`)).toString(), compressible);
  });

  test("skips existing compressed files with skipExisting", async () => {
    await writeFile(`${file}.gz`, "existing");

    const result = await compressFile(file, { deleteLarger: false, skipExisting: true });

    assert.deepEqual(result.outputs[0], { file: `${file}.gz`, status: "skipped" });
    assert.equal(result.outputs[1].status, "written");
    assert.equal(await readFile(`${file}.gz`, "utf8"), "existing");
  });

  test("keeps compressed files that are not smaller by default", async () => {
    await writeFile(file, randomBytes(64));

    const result = await compressFile(file, keep);

    assert.deepEqual(
      result.outputs.map((output) => output.status),
      ["written", "written"]
    );
    assert.deepEqual((await readdir(dir)).sort(), ["app.js", "app.js.br", "app.js.gz"]);
  });

  test("deletes compressed files that are not smaller with deleteLarger", async () => {
    await writeFile(file, randomBytes(64));
    await writeFile(`${file}.gz`, "outdated");

    const result = await compressFile(file, { deleteLarger: true, skipExisting: false });

    for (const output of result.outputs) {
      assert.equal(output.status, "deleted");
      assert.ok(output.status === "deleted" && output.size >= 64);
    }
    assert.deepEqual(await readdir(dir), ["app.js"]);
  });

  test("rejects when the file does not exist", async () => {
    await assert.rejects(compressFile(join(dir, "missing.js"), keep), { code: "ENOENT" });
  });
});

describe("isCompressed", () => {
  test("is true for files with a compressed file extension", () => {
    assert.equal(isCompressed("app.js.gz"), true);
    assert.equal(isCompressed("app.js.br"), true);
    assert.equal(isCompressed(join("dist", "APP.JS.GZ")), true);
  });

  test("is false for other files", () => {
    assert.equal(isCompressed("app.js"), false);
    assert.equal(isCompressed("gz"), false);
    assert.equal(isCompressed("archive.tgz"), false);
  });
});
