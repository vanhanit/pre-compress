import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "node:test";

/** Text that compresses well. */
export const compressible = "hello world ".repeat(200);

/**
 * Creates an empty temporary directory before each test of the current suite and removes it afterwards. With
 * `chdir`, the tests also run inside it. Returns a function that gives the directory of the running test.
 */
export function useTempDir({ chdir = false } = {}): () => string {
  const cwd = process.cwd();
  let dir = "";

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pre-compress-"));
    if (chdir) {
      process.chdir(dir);
    }
  });

  afterEach(async () => {
    if (chdir) {
      process.chdir(cwd);
    }
    await rm(dir, { recursive: true, force: true });
  });

  return () => dir;
}
