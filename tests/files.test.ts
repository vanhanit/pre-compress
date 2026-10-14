import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { findFiles, isFile } from "../src/files.ts";

describe("findFiles", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
    await mkdir(join(dir, "assets", "dir.js"), { recursive: true });
    await writeFile(join(dir, "index.html"), "");
    await writeFile(join(dir, "assets", "app.js"), "");
    await writeFile(join(dir, "assets", "app.css"), "");
    await writeFile(join(dir, "assets", ".hidden.js"), "");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("returns the matching files relative to the working directory in order", async () => {
    const files = await findFiles(["**/*.css", "**/*.html", "**/*.js"], dir);

    assert.deepEqual(files, [join("assets", "app.css"), join("assets", "app.js"), "index.html"]);
  });

  test("returns each file once when several patterns match it", async () => {
    const files = await findFiles(["assets/*.js", "assets/app.*", "./assets/app.js"], dir);

    assert.deepEqual(files, [join("assets", "app.css"), join("assets", "app.js")]);
  });

  test("returns absolute paths for absolute patterns", async () => {
    const files = await findFiles([join(dir, "assets", "*.css")], tmpdir());

    assert.deepEqual(files, [join(dir, "assets", "app.css")]);
  });

  test("returns nothing when no files match", async () => {
    assert.deepEqual(await findFiles(["**/*.txt"], dir), []);
  });

  test("skips broken symbolic links", { skip: process.platform === "win32" }, async () => {
    await symlink(join(dir, "missing.js"), join(dir, "broken.js"));

    assert.deepEqual(await findFiles(["*.js"], dir), []);
  });
});

describe("isFile", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("is true for files", async () => {
    await writeFile(join(dir, "app.js"), "");

    assert.equal(await isFile(join(dir, "app.js")), true);
  });

  test("is false for directories and missing paths", async () => {
    assert.equal(await isFile(dir), false);
    assert.equal(await isFile(join(dir, "missing.js")), false);
  });

  test("rejects for other errors", async () => {
    await assert.rejects(isFile(join(dir, "invalid\0name")), { code: "ERR_INVALID_ARG_VALUE" });
  });
});
