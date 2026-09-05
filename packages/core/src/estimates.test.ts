import { describe, it, expect } from "vitest";
import {
  accumulateRange,
  addMinutesToRange,
  rangeFromMinutes,
  rangeMinutes,
} from "./estimates";

describe("estimates — range accumulation (roadmap §6.2)", () => {
  it("sums each bound independently", () => {
    const total = accumulateRange([
      { optimistic: 530, expected: 605, conservative: 690 },
      { optimistic: 60, expected: 75, conservative: 90 },
    ]);
    expect(total).toEqual({ optimistic: 590, expected: 680, conservative: 780 });
  });

  it("accumulate is associative under grouping", () => {
    const a = { optimistic: 10, expected: 20, conservative: 30 };
    const b = { optimistic: 5, expected: 8, conservative: 11 };
    const c = { optimistic: 100, expected: 200, conservative: 300 };
    const left = accumulateRange([accumulateRange([a, b]), c]);
    const right = accumulateRange([a, accumulateRange([b, c])]);
    expect(left).toEqual(right);
  });

  it("accumulating an empty list yields the zero range", () => {
    expect(accumulateRange([])).toEqual({ optimistic: 0, expected: 0, conservative: 0 });
  });

  it("bounds stay ordered optimistic <= expected <= conservative after add", () => {
    const r = addMinutesToRange({ optimistic: 100, expected: 120, conservative: 150 }, 45);
    expect(r).toEqual({ optimistic: 145, expected: 165, conservative: 195 });
    expect(r.optimistic).toBeLessThanOrEqual(r.expected);
    expect(r.expected).toBeLessThanOrEqual(r.conservative);
  });

  it("rangeMinutes reports each bound in minutes", () => {
    expect(rangeMinutes({ optimistic: 10, expected: 20, conservative: 30 })).toEqual({
      optimistic: 10,
      expected: 20,
      conservative: 30,
    });
  });

  it("rangeFromMinutes creates a degenerate (exact) range", () => {
    expect(rangeFromMinutes(45)).toEqual({
      optimistic: 45,
      expected: 45,
      conservative: 45,
    });
  });
});
