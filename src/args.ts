import { parseArgs } from "node:util";
import { ENCODING_NAMES, type CompressionOptions, type EncodingName } from "./compress.ts";

export type Command =
  { name: "help" } | { name: "version" } | { name: "compress"; patterns: string[]; options: CompressionOptions };

/**
 * Invalid command line arguments.
 */
export class ArgumentError extends Error {
  override name = "ArgumentError";
}

const DEFAULT_ENCODINGS: readonly EncodingName[] = ["gzip", "brotli"];

const OPTIONS = {
  files: { type: "string", short: "f", multiple: true },
  encodings: { type: "string", short: "e", multiple: true },
  "delete-larger": { type: "boolean", short: "d" },
  "skip-existing": { type: "boolean", short: "s" },
  version: { type: "boolean", short: "V" },
  help: { type: "boolean", short: "h" }
} as const;

type OptionName = keyof typeof OPTIONS;

const DESCRIPTIONS: Readonly<Record<OptionName, string>> = {
  files: "the files to compress, supports glob patterns to match multiple files",
  encodings: `the encodings to write: ${ENCODING_NAMES.join(", ")} (default: ${DEFAULT_ENCODINGS.join(",")})`,
  "delete-larger": "delete compressed files that are not smaller than the source",
  "skip-existing": "don't compress if the compressed version is newer than the source",
  version: "output the version number",
  help: "display help for command"
};

function flags(name: OptionName): string {
  const option: { short: string; type: string } = OPTIONS[name];
  const value = option.type === "string" ? ` <${name}...>` : "";
  return `-${option.short}, --${name}${value}`;
}

function parse(args: readonly string[]) {
  try {
    return parseArgs({ args: [...args], options: OPTIONS, allowPositionals: true });
  } catch (error) {
    throw new ArgumentError((error as Error).message);
  }
}

function parseEncodings(values: readonly string[]): EncodingName[] {
  const names = new Set(values.flatMap((value) => value.split(",")));
  for (const name of names) {
    if (!ENCODING_NAMES.includes(name as EncodingName)) {
      throw new ArgumentError(`unknown encoding '${name}', choose from ${ENCODING_NAMES.join(", ")}`);
    }
  }
  return [...names] as EncodingName[];
}

/**
 * Parses the command line arguments, without the node and script paths. Patterns may follow `-f` or be repeated.
 */
export function parseArguments(args: readonly string[]): Command {
  const { values, positionals } = parse(args);

  if (values.help) {
    return { name: "help" };
  }
  if (values.version) {
    return { name: "version" };
  }

  const patterns = [...(values.files ?? []), ...positionals];
  if (patterns.length === 0) {
    throw new ArgumentError(`required option '${flags("files")}' not specified`);
  }

  return {
    name: "compress",
    patterns,
    options: {
      encodings: values.encodings ? parseEncodings(values.encodings) : DEFAULT_ENCODINGS,
      deleteLarger: values["delete-larger"] ?? false,
      skipExisting: values["skip-existing"] ?? false
    }
  };
}

/**
 * Returns the help text.
 */
export function usage(name: string, description: string): string {
  const names = Object.keys(OPTIONS) as OptionName[];
  const width = Math.max(...names.map((option) => flags(option).length));
  const options = names.map((option) => `  ${flags(option).padEnd(width)}  ${DESCRIPTIONS[option]}`);
  return [`Usage: ${name} [options]`, "", description, "", "Options:", ...options].join("\n");
}
