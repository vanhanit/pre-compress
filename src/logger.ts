import { Chalk } from "chalk";

export type Colors = "green" | "yellow" | "red";

export type Color = {
  [key in Colors]: (...data: any[]) => string | Chalk;
};

export default interface Logger {
  debug: (...data: any[]) => void;
  verbose: (...data: any[]) => void;
  warn: (...data: any[]) => void;
  error: (...data: any[]) => void;
  colors: Color;
}
