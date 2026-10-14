import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ArgumentError, parseArguments, usage } from "../src/args.ts";

describe("parseArguments", () => {
  test("parses the patterns given after -f", () => {
    assert.deepEqual(parseArguments(["-f", "*.js", "*.css"]), {
      name: "compress",
      patterns: ["*.js", "*.css"],
      options: { encodings: ["gzip", "brotli"], deleteLarger: false, skipExisting: false }
    });
  });

  test("parses long options and repeated --files", () => {
    assert.deepEqual(parseArguments(["--files", "*.js", "--files=*.css", "--delete-larger", "--skip-existing"]), {
      name: "compress",
      patterns: ["*.js", "*.css"],
      options: { encodings: ["gzip", "brotli"], deleteLarger: true, skipExisting: true }
    });
  });

  test("parses grouped short flags", () => {
    assert.deepEqual(parseArguments(["-ds", "-f", "*.js"]), {
      name: "compress",
      patterns: ["*.js"],
      options: { encodings: ["gzip", "brotli"], deleteLarger: true, skipExisting: true }
    });
  });

  test("parses comma-separated encodings once each", () => {
    const command = parseArguments(["-e", "zstd,brotli", "--encodings=gzip,zstd", "-f", "*.js"]);

    assert.equal(command.name, "compress");
    assert.deepEqual(command.options.encodings, ["zstd", "brotli", "gzip"]);
  });

  test("throws an ArgumentError for unknown encodings", () => {
    assert.throws(() => parseArguments(["-e", "gzip,deflate", "-f", "*.js"]), {
      name: "ArgumentError",
      message: "unknown encoding 'deflate', choose from gzip, brotli, zstd"
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
  test("aligns every option with its description", () => {
    assert.equal(
      usage("pre-compress", "Compress static files."),
      [
        "Usage: pre-compress [options]",
        "",
        "Compress static files.",
        "",
        "Options:",
        "  -f, --files <files...>          the files to compress, supports glob patterns to match multiple files",
        "  -e, --encodings <encodings...>  the encodings to write: gzip, brotli, zstd (default: gzip,brotli)",
        "  -d, --delete-larger             delete compressed files that are not smaller than the source",
        "  -s, --skip-existing             don't compress if the compressed version is newer than the source",
        "  -V, --version                   output the version number",
        "  -h, --help                      display help for command"
      ].join("\n")
    );
  });
});
