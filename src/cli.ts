import { availableParallelism } from "node:os";
import { performance } from "node:perf_hooks";
import { styleText } from "node:util";
import { ArgumentError, parseArguments, usage, type Command } from "./args.ts";
import { compressFile, isCompressed, type CompressionResult, type Output } from "./compress.ts";
import { mapConcurrently } from "./concurrency.ts";
import { findFiles } from "./files.ts";
import { formatDuration, pluralize } from "./format.ts";
import { readPackageInfo } from "./package-info.ts";

/**
 * Where messages are written, `console` by default.
 */
export interface Io {
  log(message: string): void;
  error(message: string): void;
}

function report({ file, size, outputs }: CompressionResult, io: Io): void {
  for (const output of outputs) {
    if (output.status === "written") {
      io.log(`Compressed file ${styleText("yellow", file)} to ${styleText("green", output.file)}`);
    } else if (output.status === "skipped") {
      io.log(`Skipped file ${styleText("yellow", output.file)} because it is up to date`);
    } else {
      io.log(
        `Deleted file ${styleText("red", output.file)} because ${output.size} byte(s) is not smaller than ${size} byte(s)`
      );
    }
  }
}

async function compress(command: Extract<Command, { name: "compress" }>, io: Io): Promise<void> {
  const startTime = performance.now();
  const files = (await findFiles(command.patterns)).filter((file) => !isCompressed(file));
  const results = await mapConcurrently(files, availableParallelism(), async (file) => {
    const result = await compressFile(file, command);
    report(result, io);
    return result;
  });
  const timeTakenMs = performance.now() - startTime;

  const outputs = results.flatMap((result) => result.outputs);
  const count = (status: Output["status"]) => outputs.filter((output) => output.status === status).length;

  io.log(
    `Processed ${pluralize(files.length, "file")} in ${styleText("green", formatDuration(timeTakenMs))}: ` +
      `${styleText("green", String(count("written")))} written, ` +
      `${styleText("yellowBright", String(count("skipped")))} skipped, ` +
      `${styleText("red", String(count("deleted")))} deleted`
  );
}

/**
 * Runs the command line interface with the arguments, without the node and script paths, and returns the exit code.
 */
export async function run(args: readonly string[], io: Io = console): Promise<number> {
  const { name, version, description } = readPackageInfo();
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
