import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatDuration, pluralize } from "../src/format.ts";

describe("formatDuration", () => {
  test("formats durations under a second in whole milliseconds", () => {
    assert.equal(formatDuration(0), "0 milliseconds");
    assert.equal(formatDuration(1), "1 millisecond");
    assert.equal(formatDuration(12.4), "12 milliseconds");
    assert.equal(formatDuration(999.4), "999 milliseconds");
  });

  test("formats durations under a minute in seconds with one decimal", () => {
    assert.equal(formatDuration(999.5), "1 second");
    assert.equal(formatDuration(1337), "1.3 seconds");
    assert.equal(formatDuration(2000), "2 seconds");
    assert.equal(formatDuration(59_949), "59.9 seconds");
  });

  test("formats longer durations in hours, minutes and seconds", () => {
    assert.equal(formatDuration(59_950), "1 minute");
    assert.equal(formatDuration(61_500), "1 minute 1.5 seconds");
    assert.equal(formatDuration(120_000), "2 minutes");
    assert.equal(formatDuration(3_600_000), "1 hour");
    assert.equal(formatDuration(7_384_000), "2 hours 3 minutes 4 seconds");
  });
});

describe("pluralize", () => {
  test("adds an s to the unit unless the count is one", () => {
    assert.equal(pluralize(0, "file"), "0 files");
    assert.equal(pluralize(1, "file"), "1 file");
    assert.equal(pluralize(2.5, "second"), "2.5 seconds");
  });
});
