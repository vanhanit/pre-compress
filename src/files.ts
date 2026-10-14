import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import { glob, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

/**
 * Returns the stats of the file at the path, following symbolic links. Undefined when it is missing or not a file.
 */
export async function statFile(path: string): Promise<Stats | undefined> {
  try {
    const stats = await stat(path);
    return stats.isFile() ? stats : undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
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
    if (await statFile(path)) {
      files.push(match);
    }
  }
  return files.sort();
}

/**
 * Writes the data to a hidden temporary file and renames it to the path, so readers never see a partial file.
 */
export async function replaceFile(path: string, data: Buffer): Promise<void> {
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, data);
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
