import { ArgumentError, parseArguments, usage } from "./args.ts";
import { mapConcurrently } from "./concurrency.ts";
import { compressFile, isCompressed, type CompressionOptions, type CompressionResult } from "./compress.ts";
import { findFiles } from "./files.ts";
import { formatDuration } from "./format.ts";
import Helpers from "./helpers.ts";
import { styleText } from "util";
import { performance } from "perf_hooks";
import { availableParallelism } from "os";

export class Index {
  private readonly argv: string[] = process.argv;

  async exec(): Promise<void> {
    const command = parseArguments(this.argv.slice(2));
    if (command.name === "help") {
      console.log(usage(Helpers.getName(), Helpers.getDescription()));
    } else if (command.name === "version") {
      console.log(Helpers.getVersion());
    } else {
      const { patterns, ...compressionOptions } = command;
      await this.compress(patterns, compressionOptions);
    }
  }

  private async compress(patterns: string[], options: CompressionOptions): Promise<void> {
    const files = (await findFiles(patterns)).filter((file) => !isCompressed(file));

    const startTime = performance.now();
    const results = await mapConcurrently(files, availableParallelism(), async (file) => {
      const result = await compressFile(file, options);
      Index.report(result);
      return result;
    });
    const timeTakenMs = performance.now() - startTime;

    const outputs = results.flatMap((result) => result.outputs);
    const compressedFiles = results.length;
    const skippedCompressions = outputs.filter((output) => output.status === "skipped").length;
    const deletedCompressions = outputs.filter((output) => output.status === "deleted").length;

    console.log(
      `Total time: ${styleText("green", formatDuration(timeTakenMs))}, Compressed files: ${styleText("green", String(compressedFiles))}, Skipped compressions: ${styleText("yellowBright", String(skippedCompressions))}, Deleted compressions: ${styleText("red", String(deletedCompressions))}`
    );
  }

  private static report({ file, size, outputs }: CompressionResult): void {
    for (const output of outputs) {
      if (output.status === "written") {
        console.log(`Compressed file ${styleText("yellow", file)} to ${styleText("green", output.file)}`);
      } else if (output.status === "skipped") {
        console.log(`Skipped file ${styleText("yellow", output.file)} because it exists`);
      } else {
        console.log(
          `Deleted file ${styleText("red", output.file)} because ${output.size} byte(s) is not smaller than ${size} byte(s)`
        );
      }
    }
  }
}

if (process.env.NODE_ENV !== "testing") {
  new Index().exec().catch((error: unknown) => {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof ArgumentError) {
      console.error(`Run '${Helpers.getName()} --help' for usage.`);
    }
    process.exitCode = 1;
  });
}
