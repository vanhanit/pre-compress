import Helpers from "./helpers";
import fg from "fast-glob";
import fs, { Stats } from "fs";
import { performance } from "perf_hooks";
import chalk from "chalk";
import pMap from "p-map";
import prettyMilliseconds from "pretty-ms";
import Logger from "./logger";
import OptionParser, { CompressionOptions, GlobOptions, ProgramOptions } from "./optionParser";
import { Compression, CompressionAlgorithm } from "./compressors/compressorBase";
import * as stream from "stream";

interface CompressionStats extends Compression {
  compressed: boolean;
  skipped: boolean;
  deleted: boolean;
  elapsedMs: number;
}

type CompressionRecord = Partial<Record<CompressionAlgorithm, CompressionStats>>;

interface CompressionResult extends Compression {
  compressions: CompressionRecord;
}

export default class PreCompress {
  private readonly argv: string[] = process.argv;

  async exec(): Promise<void> {
    const options = OptionParser.parse(this.argv);
    await this.compress(options);
  }

  private async compress(options: ProgramOptions): Promise<void> {
    const { files, verbose, quiet, color } = options;
    const globOptions: GlobOptions = Helpers.pick(options, "cwd");
    const compressionOptions: CompressionOptions = Helpers.pick(
      options,
      "deleteLarger",
      "skipExisting",
      "blockSize",
      "compressors",
      "concurrency"
    );

    const logger: Logger = {
      debug: (...data) => quiet || console.log(...data),
      verbose: (...data) => quiet || console.log(...data),
      warn: (...data) => quiet || console.log(...data),
      error: (...data) => quiet || console.log(...data),
      colors: {
        green: (...data) => (color ? chalk.green(data) : chalk(data)),
        yellow: (...data) => (color ? chalk.yellowBright(data) : chalk(data)),
        red: (...data) => (color ? chalk.red(data) : chalk(data))
      }
    };

    const compressFiles = await this.parseGlobPatterns(files, globOptions);

    if (compressFiles.length > 0) {
      const startTime = performance.now();
      const result = await this.compressFiles(compressFiles, compressionOptions);
      const endTime = performance.now();

      const timeTaken = prettyMilliseconds(endTime - startTime, { verbose: true });
      const compressedFiles = result.length.toString(10);
      /*const skippedCompressions = result
        .map((res) => res.skipped)
        .reduce((previousValue, currentValue) => previousValue + currentValue, 0)
        .toString(10);
      const deletedCompressions = result
        .map((res) => res.deleted)
        .reduce((previousValue, currentValue) => previousValue + currentValue, 0)
        .toString(10);
      const maxLength = Math.max(compressedFiles.length, skippedCompressions.length, deletedCompressions.length);*/

      logger.verbose("Total time:   %s", logger.colors.green(timeTaken));
      logger.verbose("  Compressed: %s file(s)", logger.colors.green(compressedFiles));
      /*logger.verbose("  Compressed: %s file(s)", logger.colors.green(compressedFiles.padStart(maxLength)));
      logger.verbose("  Skipped   : %s file(s)", logger.colors.yellow(skippedCompressions.padStart(maxLength)));
      logger.verbose("  Deleted   : %s file(s)", logger.colors.red(deletedCompressions.padStart(maxLength)));*/
    } else {
      logger.verbose(logger.colors.yellow("No patterns specified"));
    }
  }

  private parseGlobPatterns(patterns: string[], options: GlobOptions): Promise<string[]> {
    return fg(patterns, {
      ...options,
      ignore: ["**/*.{gz,br}"],
      onlyFiles: true,
      unique: true
    });
  }

  private runCompressionEnd(compressionRecords: CompressionRecord, sourceStats: Stats) {
    const keys = Object.keys(compressionRecords) as CompressionAlgorithm[];
    keys.forEach((key) => {
      const record = compressionRecords[key] as CompressionStats;

      if (record.compressed) {
        const reduction = (record.fileSize / sourceStats.size - 1) * 100;
        const printColor = reduction < 0 ? chalk.green : chalk.red;
        console.log(
          `Compressed file ${chalk.green(record.file)} in ${prettyMilliseconds(record.elapsedMs, {
            verbose: true
          })}. Compressed size is ${record.fileSize} byte(s) (${printColor(
            `${reduction > 0 ? "+" : ""}${Math.round(reduction * 100) / 100} %`
          )})`
        );
      }

      if (record.skipped) {
        console.log(`Skipped file ${chalk.yellow(record.file)} because it already exists`);
      }

      if (record.deleted) {
        fs.rmSync(record.file);

        console.log(
          `Deleted file ${chalk.red(record.file)} because ${record.fileSize} byte(s) is larger than ${
            sourceStats.size
          } byte(s)`
        );
      }
    });
  }

  private async compressFile(file: string, options: CompressionOptions): Promise<CompressionResult> {
    const { deleteLarger, skipExisting, blockSize, compressors } = options ?? {};

    const compressionAlgorithms = Object.keys(compressors) as CompressionAlgorithm[];
    if (compressionAlgorithms.length > 0) {
      return new Promise<CompressionResult>(async (resolve) => {
        const finishedCompressions: CompressionStats[] = [];
        const startTime = performance.now();
        const sourceStat = fs.statSync(file);
        const compressStreams = Helpers.mapObject(compressors, (value) => {
          return value.create(file, sourceStat, (compressionResult: CompressionStats) => {
            compressionResult.elapsedMs = performance.now() - startTime;
            compressionResult.compressed = true;
            compressionResult.deleted = deleteLarger && compressionResult.fileSize >= sourceStat.size;

            finishedCompressions.push(compressionResult);

            if (finishedCompressions.length >= compressionAlgorithms.length) {
              this.runCompressionEnd(result.compressions, sourceStat);
              resolve(result);
            }
          });
        });
        const result: CompressionResult = {
          file,
          fileSize: sourceStat.size,
          compressions: Helpers.mapObject(compressStreams, (value) => {
            const ret = value.compression;
            ret.deleted = ret.fileSize >= sourceStat.size && deleteLarger;
            ret.skipped = ret.fileSize >= 0 && skipExisting;
            ret.compressed = false;
            ret.elapsedMs = 0;
            return ret;
          })
        };

        const streams = Object.entries(compressStreams)
          .map(([key, compressor]) => {
            const compressionAlgorithm = key as CompressionAlgorithm;
            const compressionStats = result.compressions[compressionAlgorithm] as CompressionStats;
            const isFinished = compressionStats.skipped || compressionStats.deleted;
            if (isFinished) {
              finishedCompressions.push(compressionStats);
            }
            return isFinished ? null : compressor.openWrite();
          })
          .filter((compressStream) => !!compressStream) as stream.Transform[];

        if (streams.length > 0) {
          const fileStream = fs.createReadStream(file, { encoding: "binary", highWaterMark: blockSize });
          const compressPipe = Helpers.splitPipe(...streams);
          fileStream.pipe(compressPipe);
        } else {
          this.runCompressionEnd(result.compressions, sourceStat);
          resolve(result);
        }
      });
    }

    return Promise.resolve({
      file,
      fileSize: -1,
      compressions: {}
    });

    /*const processCompression = async () => {
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
        const fileStat = fs.statSync(file);
        const data = fs.readFileSync(file);
        const readStream = fs.createReadStream(file, { encoding: "binary" });
        const writeStream = fs.createWriteStream(file + ".test", { encoding: "binary" });
        const com = zlib.createGzip();

        com.pipe(writeStream);
        zlib.createBrotliCompress();
        zlib.create;

        writeStream.pipe();

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

    return processCompression();*/
  }

  private async compressFiles(files: string[], options: CompressionOptions): Promise<CompressionResult[]> {
    const mapper = async (file: string) => {
      return this.compressFile(file, options);
    };

    return pMap(files, mapper, { concurrency: Math.min(files.length, options.concurrency) });
  }
}
