import * as pack from "../package.json";

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
