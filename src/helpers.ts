import * as pack from "../package.json";
import stream from "node:stream";
import { PassThrough } from "stream";
import fs from "fs";

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

  /**
   * Pick a set of keys from a object into a shallow copy.
   * @param obj The object to pick from.
   * @param keysToPick The keys to pick from the object.
   */
  static pick<T extends TRet, TRet>(obj: T, ...keysToPick: (keyof TRet)[]): TRet {
    const copy = {} as TRet;

    keysToPick.forEach((key) => (copy[key] = obj[key]));

    return copy;
  }

  static splitPipe(...streams: stream.Transform[]): stream.Transform {
    const pass: PassThrough = new PassThrough();

    pass.on("data", async (chunk: any) => {
      const writers = streams.map(
        (stream: stream.Transform) =>
          new Promise<void>((resolve) => {
            stream.write(chunk);
            resolve();
          })
      );

      await Promise.all(writers);
    });

    pass.on("end", () => {
      streams.forEach((stream: stream.Transform) => stream.end());
    });

    return pass;
  }

  static mapObject<T, TRet>(obj: T, map: (value: T[keyof T], key: keyof T) => TRet): Record<keyof T, TRet> {
    const copy: Record<keyof T, TRet> = ({} as unknown) as Record<keyof T, TRet>;

    (Object.keys(obj) as (keyof T)[]).forEach((key) => {
      copy[key] = map(obj[key], key);
    });

    return copy;
  }

  static fileStats(file: string) {
    try {
      return fs.statSync(file);
    } catch (e) {
      return null;
    }
  }
}
