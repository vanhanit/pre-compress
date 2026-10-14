#!/usr/bin/env node
import { configureThreadPool } from "./thread-pool.ts";

// The CLI is loaded afterwards, so nothing can use the thread pool before it is sized.
configureThreadPool();
const { run } = await import("./cli.ts");

process.exitCode = await run(process.argv.slice(2));
