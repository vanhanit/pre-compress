import { parseArgs } from "node:util";

export type Command =
  | { name: "help" }
  | { name: "version" }
  | { name: "compress"; patterns: string[]; deleteLarger: boolean; skipExisting: boolean };

/**
 * Invalid command line arguments.
 */
export class ArgumentError extends Error {
  override name = "ArgumentError";
}

const OPTIONS = {
  files: { type: "string", short: "f", multiple: true },
  "delete-larger": { type: "boolean", short: "d" },
  "skip-existing": { type: "boolean", short: "s" },
  version: { type: "boolean", short: "V" },
  help: { type: "boolean", short: "h" }
} as const;

const HELP: ReadonlyArray<readonly [flags: string, description: string]> = [
  ["-f, --files <files...>", "the files to compress, supports glob patterns to match multiple files"],
  ["-d, --delete-larger", "delete compressed files that are not smaller than the source"],
  ["-s, --skip-existing", "don't compress if the compressed version is newer than the source"],
  ["-V, --version", "output the version number"],
  ["-h, --help", "display help for command"]
];

function parse(args: readonly string[]) {
  try {
    return parseArgs({ args: [...args], options: OPTIONS, allowPositionals: true });
  } catch (error) {
    throw new ArgumentError((error as Error).message);
  }
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
    throw new ArgumentError("required option '-f, --files <files...>' not specified");
  }

  return {
    name: "compress",
    patterns,
    deleteLarger: values["delete-larger"] ?? false,
    skipExisting: values["skip-existing"] ?? false
  };
}

/**
 * Returns the help text.
 */
export function usage(name: string, description: string): string {
  const width = Math.max(...HELP.map(([flags]) => flags.length));
  const options = HELP.map(([flags, text]) => `  ${flags.padEnd(width)}  ${text}`);
  return [`Usage: ${name} [options]`, "", description, "", "Options:", ...options].join("\n");
}
