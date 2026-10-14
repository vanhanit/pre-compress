import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { readPackageInfo } from "../src/package-info.ts";

describe("readPackageInfo", () => {
  test("returns the command, version and description from package.json", async () => {
    const pack = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      bin: Record<string, string>;
      version: string;
      description: string;
    };

    assert.deepEqual(readPackageInfo(), {
      command: Object.keys(pack.bin)[0],
      version: pack.version,
      description: pack.description
    });
    assert.equal(readPackageInfo().command, "pre-compress");
  });
});
