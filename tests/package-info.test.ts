import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { readPackageInfo } from "../src/package-info.ts";

describe("readPackageInfo", () => {
  test("returns the name, version and description from package.json", async () => {
    const pack = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      name: string;
      version: string;
      description: string;
    };

    assert.deepEqual(readPackageInfo(), { name: pack.name, version: pack.version, description: pack.description });
  });
});
