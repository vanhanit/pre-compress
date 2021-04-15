import Helpers from "./helpers";
import commander from "commander";
import fg from "fast-glob";
import fs from "fs";
import { promisify } from "util";
import { constants, gzip, brotliCompress } from "zlib";
import { performance } from "perf_hooks";
import chalk from "chalk";
import pMap from "p-map";
import { cpus } from "os";
import prettyMilliseconds from "pretty-ms";

interface CompressionOptions {
  deleteLarger?: boolean;
  skipExisting?: boolean;
}

interface ProgramArgs extends CompressionOptions {
  files: string[];
}

interface CompressionResult {
  file: string;
  compressed: number;
  deleted: number;
  skipped: number;
}

export class Index {
  private readonly argv: string[] = process.argv;
  private readonly env: NodeJS.ProcessEnv = process.env;
  private program = new commander.Command();

  async exec(): Promise<void> {
    this.program.version(Helpers.getVersion()).name(Helpers.getName());

    this.program
      .description(Helpers.getDescription())
      .requiredOption("-f, --files <files...>", "the files to compress, supports glob patterns to match multiple files")
      .option("-d, --delete-larger", "delete compressed files that is larger than the source")
      .option("-s, --skip-existing", "don't compress if the compressed version exist")
      .action(this.compress.bind(this));

    await this.program.parseAsync(this.argv);
  }

  private async compress(args: ProgramArgs): Promise<void> {
    const { files, ...compressionOptions } = args;
    const compressFiles = await this.parseGlobPatterns(files).then(this.uniqueFiles).then(this.notCompressed);

    const startTime = performance.now();
    const result = await this.compressFiles(compressFiles, compressionOptions);
    const endTime = performance.now();

    const timeTakenMs = endTime - startTime;
    const compressedFiles = result.length;
    const skippedCompressions = result
      .map((res) => res.skipped)
      .reduce((previousValue, currentValue) => previousValue + currentValue, 0);
    const deletedCompressions = result
      .map((res) => res.deleted)
      .reduce((previousValue, currentValue) => previousValue + currentValue, 0);

    console.log(
      `Total time: ${chalk.green(
        prettyMilliseconds(timeTakenMs, {
          verbose: true
        })
      )}, Compressed files: ${chalk.green(compressedFiles)}, Skipped compressions: ${chalk.yellowBright(
        skippedCompressions
      )}, Deleted compressions: ${chalk.red(deletedCompressions)}`
    );
  }

  private static getExtension(file: string): string {
    return file.toLowerCase().split(".").pop() as string;
  }

  private parseGlobPatterns(patterns: string[]): Promise<string[]> {
    return fg(patterns, {
      onlyFiles: true
    });
  }

  private async uniqueFiles(files: string[]): Promise<string[]> {
    return files.filter(Index.unique);
  }

  private async notCompressed(files: string[]) {
    const skipExtensions = ["gz", "br"];
    return files.filter((file) => file && !skipExtensions.includes(Index.getExtension(file)));
  }

  private async compressFile(file: string, options?: CompressionOptions): Promise<CompressionResult> {
    const { deleteLarger = false, skipExisting = false } = options ?? {};

    const source = fs.statSync(file);

    const gzipOpts = {
      level: constants.Z_BEST_COMPRESSION
    };

    const brotliOpts = {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: source.size
      }
    };

    type CompressionFunc = (data: Buffer) => Promise<Buffer>;
    type CompressionFunc2 = (data: Buffer) => Promise<string>;

    const extensions: Record<string, CompressionFunc> = {
      gz: (data) => promisify(gzip)(data, gzipOpts),
      br: (data) => promisify(brotliCompress)(data, brotliOpts)
    };

    const processCompression = async () => {
      const compressions: CompressionFunc2[] = [];

      const ret: CompressionResult = {
        file,
        compressed: 0,
        deleted: 0,
        skipped: 0
      };

      for (const ext in extensions) {
        if (!extensions.hasOwnProperty(ext)) {
          continue;
        }

        const compress = extensions[ext];
        const targetFile = `${file}.${ext}`;

        if (this.fileExists(targetFile) && skipExisting) {
          ret.skipped++;
          continue;
        }

        compressions.push((data) =>
          compress(data)
            .then((buffer) => fs.promises.writeFile(targetFile, buffer))
            .then(() => targetFile)
        );
      }

      if (compressions.length > 0) {
        console.log(`Reading file ${chalk.green(file)}`);
        const data = fs.readFileSync(file);

        const compressionPromises = compressions.map((compress) => {
          console.log(`Compressing file ${chalk.yellow(file)}`);
          return compress(data).then((targetFile) => {
            console.log(`Compressed file ${chalk.yellow(file)} to ${chalk.green(targetFile)}`);
            ret.compressed++;

            if (deleteLarger) {
              const target = fs.statSync(targetFile);

              if (target.size >= source.size) {
                fs.rmSync(targetFile);
                ret.deleted++;

                console.log(
                  `Deleted file ${chalk.red(targetFile)} because ${target.size} byte(s) is larger than ${
                    source.size
                  } byte(s)`
                );
              }
            }
          });
        });

        await Promise.all(compressionPromises);
      }

      return ret;
    };

    return processCompression();
  }

  private async compressFiles(files: string[], options?: CompressionOptions): Promise<CompressionResult[]> {
    const mapper = async (file: string) => {
      return this.compressFile(file, options);
    };

    return pMap(files, mapper, { concurrency: Math.min(files.length, cpus().length) });
  }

  private fileExists(file: string): boolean {
    try {
      const stat = fs.statSync(file);
      return stat.isFile();
    } catch (e) {
      return false;
    }
  }

  private static unique<T>(value: T, index: number, self: T[]) {
    return self.indexOf(value) === index;
  }
}

if (process.env.NODE_ENV !== "testing") {
  new Index().exec();
}
