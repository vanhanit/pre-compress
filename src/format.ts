const TENTHS_PER_UNIT: ReadonlyArray<readonly [unit: string, tenths: number]> = [
  ["hour", 36_000],
  ["minute", 600]
];

/**
 * Returns the count with the unit, adding an s unless the count is one.
 */
export function pluralize(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/**
 * Formats a duration for humans, e.g. `1 minute 1.5 seconds`.
 */
export function formatDuration(milliseconds: number): string {
  const rounded = Math.round(milliseconds);
  if (rounded < 1000) {
    return pluralize(rounded, "millisecond");
  }

  let tenths = Math.round(milliseconds / 100);
  const parts: string[] = [];
  for (const [unit, size] of TENTHS_PER_UNIT) {
    const count = Math.floor(tenths / size);
    if (count > 0) {
      parts.push(pluralize(count, unit));
      tenths -= count * size;
    }
  }
  if (tenths > 0) {
    parts.push(pluralize(tenths / 10, "second"));
  }
  return parts.join(" ");
}
