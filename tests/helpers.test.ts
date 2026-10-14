import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import Helpers from "../src/helpers.ts";

const pack = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  name: string;
  version: string;
  description: string;
};

describe("helpers", () => {
  test("getVersion returns the version from package.json", () => {
    assert.equal(Helpers.getVersion(), pack.version);
  });

  test("getName returns the name from package.json", () => {
    assert.equal(Helpers.getName(), pack.name);
  });

  test("getDescription returns the description from package.json", () => {
    assert.equal(Helpers.getDescription(), pack.description);
  });
});
