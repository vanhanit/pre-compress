import { availableParallelism } from "node:os";
import { performance } from "node:perf_hooks";
import { styleText } from "node:util";
import { ArgumentError, parseArguments, usage, type Command } from "./args.ts";
import { compressFile, isCompressed } from "./compress.ts";
import { mapConcurrently } from "./concurrency.ts";
import { findFiles } from "./files.ts";
import { readPackageInfo } from "./package-info.ts";
import { describeResult, summarize, type Style } from "./report.ts";

/**
 * Where messages are written and how they are colored.
 */
export interface Io {
  log(message: string): void;
  error(message: string): void;
  style: Style;
}

const consoleIo: Io = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
  style: (color, text) => styleText(color, text)
};

async function compress({ patterns, options }: Extract<Command, { name: "compress" }>, io: Io): Promise<void> {
  const startTime = performance.now();
  const files = (await findFiles(patterns)).filter((file) => !isCompressed(file));
  const results = await mapConcurrently(files, availableParallelism(), async (file) => {
    const result = await compressFile(file, options);
    for (const line of describeResult(result, io.style)) {
      io.log(line);
    }
    return result;
  });
  io.log(summarize(results, performance.now() - startTime, io.style));
}

/**
 * Runs the command line interface with the arguments, without the node and script paths, and returns the exit code.
 */
export async function run(args: readonly string[], io: Io = consoleIo): Promise<number> {
  const { command: name, version, description } = readPackageInfo();
  try {
    const command = parseArguments(args);
    if (command.name === "help") {
      io.log(usage(name, description));
    } else if (command.name === "version") {
      io.log(version);
    } else {
      await compress(command, io);
    }
    return 0;
  } catch (error) {
    io.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof ArgumentError) {
      io.error(`Run '${name} --help' for usage.`);
    }
    return 1;
  }
}
