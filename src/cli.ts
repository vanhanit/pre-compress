import { availableParallelism } from "node:os";
import { performance } from "node:perf_hooks";
import { styleText } from "node:util";
import { ArgumentError, parseArguments, usage, type Command } from "./args.ts";
import { compressFile, isCompressed, type CompressionResult } from "./compress.ts";
import { mapConcurrently } from "./concurrency.ts";
import { findFiles } from "./files.ts";
import { formatDuration } from "./format.ts";
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
  const files = (await findFiles(command.patterns)).filter((file) => !isCompressed(file));

  const startTime = performance.now();
  const results = await mapConcurrently(files, availableParallelism(), async (file) => {
    const result = await compressFile(file, command);
    report(result, io);
    return result;
  });
  const timeTakenMs = performance.now() - startTime;

  const outputs = results.flatMap((result) => result.outputs);
  const compressedFiles = results.length;
  const skippedCompressions = outputs.filter((output) => output.status === "skipped").length;
  const deletedCompressions = outputs.filter((output) => output.status === "deleted").length;

  io.log(
    `Total time: ${styleText("green", formatDuration(timeTakenMs))}, Compressed files: ${styleText("green", String(compressedFiles))}, Skipped compressions: ${styleText("yellowBright", String(skippedCompressions))}, Deleted compressions: ${styleText("red", String(deletedCompressions))}`
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
