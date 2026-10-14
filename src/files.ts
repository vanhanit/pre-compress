import { glob, stat } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Whether the path is a file, following symbolic links. False when it does not exist.
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/**
 * Finds the files matching any of the glob patterns. Paths are relative to `cwd`, unless the pattern is absolute.
 * Directories, dotfiles and broken symbolic links are skipped.
 */
export async function findFiles(patterns: readonly string[], cwd: string = process.cwd()): Promise<string[]> {
  const matches = new Map<string, string>();
  for await (const match of glob([...patterns], { cwd })) {
    const path = resolve(cwd, match);
    if (!matches.has(path)) {
      matches.set(path, match);
    }
  }

  const files: string[] = [];
  for (const [path, match] of matches) {
    if (await isFile(path)) {
      files.push(match);
    }
  }
  return files.sort();
}
