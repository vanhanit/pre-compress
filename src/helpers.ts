import { readFileSync } from "node:fs";

interface PackageJson {
  name: string;
  version: string;
  description: string;
}

const pack = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as PackageJson;

export default class Helpers {
  /**
   * Returns package version.
   */
  static getVersion(): string {
    return pack.version;
  }

  /**
   * Returns package name.
   */
  static getName(): string {
    return pack.name;
  }

  /**
   * Returns package description.
   */
  static getDescription(): string {
    return pack.description;
  }
}
