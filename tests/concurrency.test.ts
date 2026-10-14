import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { mapConcurrently } from "../src/concurrency.ts";

describe("mapConcurrently", () => {
  test("returns the results in input order", async () => {
    const results = await mapConcurrently([30, 10, 20], 3, async (ms) => {
      await delay(ms);
      return ms * 2;
    });

    assert.deepEqual(results, [60, 20, 40]);
  });

  test("runs at most the given number of mappers at once", async () => {
    let running = 0;
    let maxRunning = 0;

    await mapConcurrently([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await delay(5);
      running--;
    });

    assert.equal(maxRunning, 3);
  });

  test("resolves to an empty array for no items", async () => {
    const results = await mapConcurrently([], 2, () => Promise.reject(new Error("not called")));

    assert.deepEqual(results, []);
  });

  test("rejects with the first error and starts no more items", async () => {
    const started: number[] = [];

    await assert.rejects(
      mapConcurrently([1, 2, 3, 4], 1, async (item) => {
        started.push(item);
        await delay(1);
        if (item === 2) {
          throw new Error("failed");
        }
      }),
      { message: "failed" }
    );
    assert.deepEqual(started, [1, 2]);
  });

  test("rejects a concurrency that is not a positive integer", async () => {
    for (const concurrency of [0, -1, 1.5, Number.NaN]) {
      await assert.rejects(
        mapConcurrently([1], concurrency, (item) => Promise.resolve(item)),
        RangeError
      );
    }
  });
});
