import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CompressionResult } from "../src/compress.ts";
import { describeResult, summarize, type Style } from "../src/report.ts";

const tags: Style = (color, text) => `<${color}>${text}</${color}>`;

const result: CompressionResult = {
  file: "app.js",
  size: 100,
  outputs: [
    { file: "app.js.gz", status: "written", size: 40 },
    { file: "app.js.br", status: "skipped" }
  ]
};

describe("describeResult", () => {
  test("describes every output of the file", () => {
    assert.deepEqual(describeResult(result, tags), [
      "Compressed file <yellow>app.js</yellow> to <green>app.js.gz</green>",
      "Skipped file <yellow>app.js.br</yellow> because it is up to date"
    ]);
  });

  test("explains why a compressed file was deleted", () => {
    const deleted: CompressionResult = {
      file: "logo.png",
      size: 100,
      outputs: [{ file: "logo.png.gz", status: "deleted", size: 120 }]
    };

    assert.deepEqual(describeResult(deleted, tags), [
      "Deleted file <red>logo.png.gz</red> because 120 byte(s) is not smaller than 100 byte(s)"
    ]);
  });
});

describe("summarize", () => {
  test("counts the outputs by status", () => {
    const deleted: CompressionResult = {
      file: "logo.png",
      size: 100,
      outputs: [{ file: "logo.png.gz", status: "deleted", size: 120 }]
    };

    assert.equal(
      summarize([result, deleted], 1500, tags),
      "Processed 2 files in <green>1.5 seconds</green>: " +
        "<green>1</green> written, <yellowBright>1</yellowBright> skipped, <red>1</red> deleted"
    );
  });

  test("summarizes when nothing was processed", () => {
    assert.equal(
      summarize([], 3, (_, text) => text),
      "Processed 0 files in 3 milliseconds: 0 written, 0 skipped, 0 deleted"
    );
  });
});
