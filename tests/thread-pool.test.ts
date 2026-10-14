import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { configureThreadPool } from "../src/thread-pool.ts";

describe("configureThreadPool", () => {
  test("uses a thread for every available core", () => {
    const env: NodeJS.ProcessEnv = {};

    configureThreadPool(env, 16);

    assert.equal(env.UV_THREADPOOL_SIZE, "16");
  });

  test("keeps the default of 4 threads on smaller machines", () => {
    const env: NodeJS.ProcessEnv = {};

    configureThreadPool(env, 2);

    assert.equal(env.UV_THREADPOOL_SIZE, "4");
  });

  test("keeps a size that is already set", () => {
    const env: NodeJS.ProcessEnv = { UV_THREADPOOL_SIZE: "2" };

    configureThreadPool(env, 16);

    assert.equal(env.UV_THREADPOOL_SIZE, "2");
  });
});
