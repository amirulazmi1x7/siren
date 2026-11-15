/** "$1,080" */
export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** "+13", "0", "-2" */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** "1 shift", "3 shifts" */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "83%" */
export function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}
