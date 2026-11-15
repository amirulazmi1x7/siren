import { describe, expect, it } from "vitest";
import { money, percent, plural, signed } from "../src/lib/format";
import { blockLabel, blockOf, clockLabel, hourLabel } from "../src/lib/time";

describe("time", () => {
  it("maps minutes to blocks, clamping the ends", () => {
    expect(blockOf(0)).toBe(0);
    expect(blockOf(119.9)).toBe(0);
    expect(blockOf(120)).toBe(1);
    expect(blockOf(720)).toBe(5);
    expect(blockOf(-5)).toBe(0);
  });

  it("labels clock times across midnight", () => {
    expect(clockLabel(0)).toBe("6:00 PM");
    expect(clockLabel(360)).toBe("12:00 AM");
    expect(clockLabel(490)).toBe("2:10 AM");
    expect(clockLabel(720)).toBe("6:00 AM");
  });

  it("labels hours and blocks", () => {
    expect(hourLabel(0)).toBe("12 AM");
    expect(hourLabel(12)).toBe("12 PM");
    expect(hourLabel(26)).toBe("2 AM");
    expect(blockLabel(2)).toBe("10 PM to 12 AM");
    expect(blockLabel(5)).toBe("4 AM to 6 AM");
  });
});

describe("format", () => {
  it("formats money, signs, plurals, percents", () => {
    expect(money(1080)).toBe("$1,080");
    expect(signed(13)).toBe("+13");
    expect(signed(0)).toBe("0");
    expect(signed(-2)).toBe("-2");
    expect(plural(1, "shift")).toBe("1 shift");
    expect(plural(3, "shift")).toBe("3 shifts");
    expect(percent(0.834)).toBe("83%");
  });
});
