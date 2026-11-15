// The night runs Friday 6 PM (t = 0) to Saturday 6 AM (t = 720), in six 2-hour blocks.

export const NIGHT_START_HOUR = 18;
export const NIGHT_MIN = 720;
export const BLOCK_MIN = 120;
export const LATE_MIN = 10;

/** Block index 0 to 5 for a time in minutes since 6 PM. t = 720 belongs to the last block. */
export function blockOf(t: number): number {
  return Math.min(5, Math.max(0, Math.floor(t / BLOCK_MIN)));
}

/** "6 PM", "12 AM" for an hour of day (any integer, wraps at 24). */
export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12} ${h < 12 ? "AM" : "PM"}`;
}

/** "10 PM to 12 AM" for block 2. */
export function blockLabel(block: number): string {
  const start = NIGHT_START_HOUR + 2 * block;
  return `${hourLabel(start)} to ${hourLabel(start + 2)}`;
}

/** "2:10 AM" for minutes since 6 PM. */
export function clockLabel(t: number): string {
  const mins = (NIGHT_START_HOUR * 60 + Math.round(t)) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
