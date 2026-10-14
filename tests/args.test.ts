import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ArgumentError, parseArguments, usage } from "../src/args.ts";

describe("parseArguments", () => {
  test("parses the patterns given after -f", () => {
    assert.deepEqual(parseArguments(["-f", "*.js", "*.css"]), {
      name: "compress",
      patterns: ["*.js", "*.css"],
      deleteLarger: false,
      skipExisting: false
    });
  });

  test("parses long options and repeated --files", () => {
    assert.deepEqual(parseArguments(["--files", "*.js", "--files=*.css", "--delete-larger", "--skip-existing"]), {
      name: "compress",
      patterns: ["*.js", "*.css"],
      deleteLarger: true,
      skipExisting: true
    });
  });

  test("parses grouped short flags", () => {
    assert.deepEqual(parseArguments(["-ds", "-f", "*.js"]), {
      name: "compress",
      patterns: ["*.js"],
      deleteLarger: true,
      skipExisting: true
    });
  });

  test("returns help for -h and --help", () => {
    assert.deepEqual(parseArguments(["-h"]), { name: "help" });
    assert.deepEqual(parseArguments(["-f", "*.js", "--help"]), { name: "help" });
  });

  test("returns version for -V and --version", () => {
    assert.deepEqual(parseArguments(["-V"]), { name: "version" });
    assert.deepEqual(parseArguments(["-f", "*.js", "--version"]), { name: "version" });
  });

  test("throws an ArgumentError without patterns", () => {
    assert.throws(() => parseArguments([]), ArgumentError);
    assert.throws(() => parseArguments(["-d"]), { name: "ArgumentError", message: /--files/ });
  });

  test("throws an ArgumentError for unknown options and missing values", () => {
    assert.throws(() => parseArguments(["-f", "*.js", "--unknown"]), { name: "ArgumentError", message: /--unknown/ });
    assert.throws(() => parseArguments(["-f"]), { name: "ArgumentError", message: /--files/ });
  });
});

describe("usage", () => {
  test("describes the command and every option", () => {
    const text = usage("pre-compress", "Compress static files.");

    assert.match(text, /^Usage: pre-compress \[options\]/);
    assert.match(text, /Compress static files\./);
    for (const option of ["--files", "--delete-larger", "--skip-existing", "--version", "--help"]) {
      assert.match(text, new RegExp(option));
    }
  });
});
