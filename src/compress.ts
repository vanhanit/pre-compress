import type { Stats } from "node:fs";
import { readFile, rm, stat } from "node:fs/promises";
import { extname } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";
import { replaceFile, statFile } from "./files.ts";

export interface CompressionOptions {
  /** Delete compressed files that are not smaller than the source. */
  deleteLarger: boolean;
  /** Keep compressed files that are not older than the source. */
  skipExisting: boolean;
}

export type Output =
  { file: string; status: "skipped" } | { file: string; status: "written" | "deleted"; size: number };

export interface CompressionResult {
  file: string;
  size: number;
  outputs: Output[];
}

interface Encoding {
  extension: string;
  compress(data: Buffer): Promise<Buffer>;
}

const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);

const ENCODINGS: readonly Encoding[] = [
  {
    extension: "gz",
    compress: (data) => gzipAsync(data, { level: constants.Z_BEST_COMPRESSION })
  },
  {
    extension: "br",
    compress: (data) =>
      brotliCompressAsync(data, {
        params: {
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
          [constants.BROTLI_PARAM_SIZE_HINT]: data.length
        }
      })
  }
];

/**
 * Whether the file has the extension of a compressed file this tool writes.
 */
export function isCompressed(file: string): boolean {
  const extension = extname(file).slice(1).toLowerCase();
  return ENCODINGS.some((encoding) => encoding.extension === extension);
}

async function isUpToDate(target: string, source: Stats): Promise<boolean> {
  const stats = await statFile(target);
  return stats !== undefined && stats.mtimeMs >= source.mtimeMs;
}

/**
 * Writes a compressed file next to the source for every encoding.
 */
export async function compressFile(file: string, options: CompressionOptions): Promise<CompressionResult> {
  const source = await stat(file);
  let data: Promise<Buffer> | undefined;

  const outputs = await Promise.all(
    ENCODINGS.map(async (encoding): Promise<Output> => {
      const target = `${file}.${encoding.extension}`;
      if (options.skipExisting && (await isUpToDate(target, source))) {
        return { file: target, status: "skipped" };
      }

      data ??= readFile(file);
      const compressed = await encoding.compress(await data);
      if (options.deleteLarger && compressed.length >= source.size) {
        await rm(target, { force: true });
        return { file: target, status: "deleted", size: compressed.length };
      }

      await replaceFile(target, compressed);
      return { file: target, status: "written", size: compressed.length };
    })
  );

  return { file, size: source.size, outputs };
}
