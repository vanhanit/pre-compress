import type { CompressionResult, Output } from "./compress.ts";
import { formatDuration, pluralize } from "./format.ts";

export type Color = "green" | "yellow" | "yellowBright" | "red";

/**
 * Colors text for output, or returns it unchanged where colors are not supported.
 */
export type Style = (color: Color, text: string) => string;

function describeOutput(file: string, size: number, output: Output, style: Style): string {
  switch (output.status) {
    case "written":
      return `Compressed file ${style("yellow", file)} to ${style("green", output.file)}`;
    case "skipped":
      return `Skipped file ${style("yellow", output.file)} because it is up to date`;
    case "deleted":
      return `Deleted file ${style("red", output.file)} because ${output.size} byte(s) is not smaller than ${size} byte(s)`;
  }
}

/**
 * Returns a line for every compressed file written, skipped or deleted for a source file.
 */
export function describeResult({ file, size, outputs }: CompressionResult, style: Style): string[] {
  return outputs.map((output) => describeOutput(file, size, output, style));
}

/**
 * Returns a line counting what was done to the compressed files of all processed source files.
 */
export function summarize(results: readonly CompressionResult[], milliseconds: number, style: Style): string {
  const counts: Record<Output["status"], number> = { written: 0, skipped: 0, deleted: 0 };
  for (const output of results.flatMap((result) => result.outputs)) {
    counts[output.status]++;
  }

  return (
    `Processed ${pluralize(results.length, "file")} in ${style("green", formatDuration(milliseconds))}: ` +
    `${style("green", String(counts.written))} written, ` +
    `${style("yellowBright", String(counts.skipped))} skipped, ` +
    `${style("red", String(counts.deleted))} deleted`
  );
}
