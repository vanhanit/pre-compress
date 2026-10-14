import { readFileSync } from "node:fs";

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
}

/**
 * Reads the name, version and description from package.json.
 */
export function readPackageInfo(): PackageInfo {
  const { name, version, description } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  ) as PackageInfo;
  return { name, version, description };
}
