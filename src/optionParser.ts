import commander from "commander";
import Helpers from "./helpers";
import filesizeParser from "filesize-parser";
import { BrotliCompressor, CompressionAlgorithm, CompressorBase, GZipCompressor } from "./compressors/compressorBase";
import { cpus } from "os";

export type Compressors = Record<CompressionAlgorithm, CompressorBase>;

export interface CompressionOptions {
  deleteLarger: boolean;
  skipExisting: boolean;
  blockSize: number;
  compressors: Compressors;
  concurrency: number;
}

export interface GlobOptions {
  cwd: string;
}

export interface ProgramOptions extends CompressionOptions, GlobOptions {
  files: string[];
  verbose: boolean;
  quiet: boolean;
  color: boolean;
}

export default class OptionParser {
  static parse(argv: string[]): ProgramOptions {
    const program = new commander.Command(Helpers.getName());

    program
      .version(Helpers.getVersion())
      .description(Helpers.getDescription())
      .arguments("<files...>")
      .option("-d, --delete-larger", "delete compressed files that are larger than the source", false)
      .option("-s, --skip-existing", "don't compress if the compressed version exist", false)
      .option(
        "-r, --concurrency <value>",
        "amount of allowed parallel file compressions",
        (value) => parseInt(value, 10),
        cpus().length
      )
      .addOption(
        new commander.Option("-c, --compressors <compressor...>", "compressors to use")
          .choices(["brotli", "gzip"])
          .default({ brotli: new BrotliCompressor(), gzip: new GZipCompressor() }, "brotli gzip")
          .argParser((value: string, previous: Record<CompressionAlgorithm, CompressorBase>) => {
            switch (value as CompressionAlgorithm) {
              case "brotli":
                return {
                  ...previous,
                  [value]: new BrotliCompressor()
                };
              case "gzip":
                return {
                  ...previous,
                  [value]: new GZipCompressor()
                };
            }

            return previous;
          })
      )
      .addOption(
        new commander.Option("-b, --block-size <size>", "maximum chunk size to read at one time per file")
          .default(filesizeParser("1MB"), "1MB")
          .argParser((value: string) => filesizeParser(value))
      )
      .option("-v, --verbose", "print verbose log messages", false)
      .option("-q, --quiet", "don't print any logs", false)
      .option("-n, --no-color", "don't print colors in logs", false)
      .option("-C, --chdir <path>", "change the working directory", process.cwd())
      .parse(argv);

    return {
      ...program.opts(),
      files: program.args
    } as ProgramOptions;
  }
}
