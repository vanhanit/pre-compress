import stream from "stream";
import fs, { Stats } from "fs";
import zlib, { BrotliOptions, constants, ZlibOptions } from "zlib";
import Helpers from "../helpers";

export type CompressionAlgorithm = "brotli" | "gzip";

type FilePathGenerator = (filePath: string) => string;

export interface Compression {
  file: string;
  fileSize: number;
}

export interface CompressorReturnValue<T extends Compression> {
  openWrite: () => stream.Transform;
  doneCallback?: (fileSize: number) => void;
  compression: T;
}

export abstract class CompressorBase {
  protected filePathGenerator: FilePathGenerator;

  protected constructor(extension: string) {
    this.filePathGenerator = (filePath) => `${filePath}.${extension}`;
  }

  protected abstract createCompressor(fileStats: Stats): stream.Transform;

  public create<T extends Compression>(
    filePath: string,
    fileStats: Stats,
    doneCallback: (result: T) => void
  ): CompressorReturnValue<T> {
    const compression: Compression = {
      file: this.filePathGenerator(filePath),
      fileSize: -1
    };
    const fileStat = Helpers.fileStats(compression.file);
    if (fileStat?.isFile()) {
      compression.fileSize = fileStat.size;
    }

    return {
      compression: compression as T,
      openWrite: () => {
        const fileStream = fs.createWriteStream(compression.file, { encoding: "binary" });
        const compressor = this.createCompressor(fileStats);

        fileStream.on("close", () => {
          compression.fileSize = Helpers.fileStats(compression.file)?.size ?? -1;
          doneCallback(compression as T);
        });

        compressor.pipe(fileStream);
        return compressor;
      }
    };
  }
}

export class BrotliCompressor extends CompressorBase {
  private readonly options: BrotliOptions = {};

  constructor(options?: BrotliOptions, filePathGenerator?: FilePathGenerator) {
    super("br");

    this.options = options ?? {};

    if (filePathGenerator) {
      this.filePathGenerator = filePathGenerator;
    }
  }

  protected createCompressor(fileStats: Stats) {
    return zlib.createBrotliCompress({
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      ...this.options,
      [constants.BROTLI_PARAM_SIZE_HINT]: fileStats.size
    });
  }
}

export class GZipCompressor extends CompressorBase {
  private readonly options: ZlibOptions = {};

  constructor(options?: ZlibOptions, filePathGenerator?: FilePathGenerator) {
    super("gz");

    this.options = options ?? {};

    if (filePathGenerator) {
      this.filePathGenerator = filePathGenerator;
    }
  }

  protected createCompressor() {
    return zlib.createGzip({
      level: constants.Z_BEST_COMPRESSION,
      ...this.options
    });
  }
}
