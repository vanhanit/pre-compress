import assert from "node:assert/strict";
import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { findFiles, replaceFile, statFile } from "../src/files.ts";

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

describe("statFile", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("returns the stats of files", async () => {
    await writeFile(join(dir, "app.js"), "content");

    assert.equal((await statFile(join(dir, "app.js")))?.size, 7);
  });

  test("returns undefined for directories and missing paths", async () => {
    assert.equal(await statFile(dir), undefined);
    assert.equal(await statFile(join(dir, "missing.js")), undefined);
  });

  test("rejects for other errors", async () => {
    await assert.rejects(statFile(join(dir, "invalid\0name")), { code: "ERR_INVALID_ARG_VALUE" });
  });
});

describe("replaceFile", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
    file = join(dir, "app.js.gz");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("writes the data to the path", async () => {
    await replaceFile(file, Buffer.from("content"));

    assert.equal(await readFile(file, "utf8"), "content");
    assert.deepEqual(await readdir(dir), ["app.js.gz"]);
  });

  test("replaces an existing file instead of writing into it", async () => {
    await writeFile(file, "old");
    await link(file, join(dir, "linked.gz"));

    await replaceFile(file, Buffer.from("new"));

    assert.equal(await readFile(file, "utf8"), "new");
    assert.equal(await readFile(join(dir, "linked.gz"), "utf8"), "old");
  });

  test("removes the temporary file when writing fails", async () => {
    await mkdir(file);

    await assert.rejects(replaceFile(file, Buffer.from("content")));
    assert.deepEqual(await readdir(dir), ["app.js.gz"]);
  });
});
