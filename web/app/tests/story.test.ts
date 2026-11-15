import { describe, expect, it } from "vitest";
import { hasPlanner, pickFor } from "../src/lib/recommend";
import { fewerLate, severityLabel, storyFor } from "../src/lib/story";
import { clockLabel } from "../src/lib/time";
import { night } from "./fixture";

const real = (["typical", "holiday", "heat"] as const).every((n) => hasPlanner(night(n)) && night(n).options?.[0]?.highlight !== undefined);

describe("severityLabel", () => {
  it("uses plain words for NYC EMS codes", () => {
    expect(severityLabel(1)).toMatch(/cardiac arrest/);
    expect(severityLabel(2)).toBe("a heart, breathing or stroke emergency");
    expect(severityLabel(3)).toMatch(/serious emergency/);
    expect(severityLabel(9)).toBe("an urgent call");
  });
});

// Sanity values from docs/brief-unstuck-page.md, at $900 (5 nurse shifts).
describe.runIf(real)("one-person card at $900 (real export)", () => {
  const expected = {
    typical: { fewer: 5, clock: "12:02 AM", severity: 2, hosp: "B", before: 16.3, after: 2.4 },
    holiday: { fewer: 10, clock: "10:26 PM", severity: 2, hosp: "A", before: 11.6, after: 2.3 },
    heat: { fewer: 7, clock: "5:26 AM", severity: 2, hosp: "B", before: 12.1, after: 2.2 },
  } as const;

  for (const [name, e] of Object.entries(expected) as [keyof typeof expected, (typeof expected)[keyof typeof expected]][]) {
    it(`${name}: matches the brief`, () => {
      const n = night(name);
      const pick = pickFor(n, 900)!;
      expect(fewerLate(n, pick)).toBe(e.fewer);
      const story = storyFor(n, pick)!;
      expect(clockLabel(story.highlight.t)).toBe(e.clock);
      expect(story.highlight.severity).toBe(e.severity);
      expect(story.highlight.hosp).toBe(e.hosp);
      expect(story.highlight.before_min).toBe(e.before);
      expect(story.highlight.after_min).toBe(e.after);
      // The pin needs the real call to exist in this night's calls.
      expect(story.call?.id).toBe(story.highlight.id);
    });
  }

  it("never exposes a lives-saved number through the story", () => {
    const story = storyFor(night("typical"), pickFor(night("typical"), 900));
    expect(Object.keys(story!.highlight)).not.toContain("arrest_survivors_per_year");
  });
});
