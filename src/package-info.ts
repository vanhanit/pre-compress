import { readFileSync } from "node:fs";

export interface PackageInfo {
  command: string;
  version: string;
  description: string;
}

/**
 * Reads the command name, version and description from package.json.
 */
export function readPackageInfo(): PackageInfo {
  const { bin, version, description } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  ) as {
    bin: Record<string, string>;
    version: string;
    description: string;
  };
  return { command: Object.keys(bin)[0], version, description };
}
