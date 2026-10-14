import { availableParallelism } from "node:os";

const DEFAULT_SIZE = 4;

/**
 * Sizes libuv's thread pool, which runs the compression, to the available cores. Its default of 4 threads leaves the
 * other cores idle. Takes effect only before the pool is first used, and keeps a size that is already set.
 */
export function configureThreadPool(
  env: NodeJS.ProcessEnv = process.env,
  cores: number = availableParallelism()
): void {
  env.UV_THREADPOOL_SIZE ??= String(Math.max(DEFAULT_SIZE, cores));
}
