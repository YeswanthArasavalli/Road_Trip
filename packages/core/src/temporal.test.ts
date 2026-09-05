import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  IST_OFFSET_MINUTES,
  toIstParts,
  istToEpochMs,
  addMinutes,
  minutesBetween,
  detectClockSkew,
} from "./temporal";

describe("temporal — IST conversions", () => {
  it("converts the hard deadline to IST parts", () => {
    // 2026-09-13T03:00:00+05:30 == 2026-09-12T21:30:00Z
    const epoch = istToEpochMs("2026-09-13", "03:00");
    const parts = toIstParts(epoch);
    expect(parts.date).toBe("2026-09-13");
    expect(parts.time).toBe("03:00");
  });

  it("round-trips an arbitrary IST wall time", () => {
    const epoch = istToEpochMs("2026-09-12", "23:50");
    const parts = toIstParts(epoch);
    expect(parts.date).toBe("2026-09-12");
    expect(parts.time).toBe("23:50");
  });

  it("exposes the fixed +05:30 offset (no DST)", () => {
    expect(IST_OFFSET_MINUTES).toBe(330);
  });
});

describe("temporal — midnight crossing (roadmap §33)", () => {
  it("Sept 12 23:50 + 20min -> Sept 13 00:10", () => {
    const t = istToEpochMs("2026-09-12", "23:50");
    const parts = toIstParts(addMinutes(t, 20));
    expect(parts.date).toBe("2026-09-13");
    expect(parts.time).toBe("00:10");
  });

  it("Sept 13 02:59 + 1min -> 03:00 (deadline instant)", () => {
    const t = istToEpochMs("2026-09-13", "02:59");
    const parts = toIstParts(addMinutes(t, 1));
    expect(parts.date).toBe("2026-09-13");
    expect(parts.time).toBe("03:00");
  });

  it("Sept 13 03:00 + 1min -> 03:01 (past deadline)", () => {
    const t = istToEpochMs("2026-09-13", "03:00");
    const parts = toIstParts(addMinutes(t, 1));
    expect(parts.time).toBe("03:01");
  });
});

describe("temporal — properties", () => {
  it("addMinutes(x, 0) === x for arbitrary epochs", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4_000_000_000_000 }), (x) => {
        expect(addMinutes(x, 0)).toBe(x);
      })
    );
  });

  it("minutesBetween(a, addMinutes(a, n)) === n", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4_000_000_000_000 }),
        fc.integer({ min: -10_000, max: 10_000 }),
        (a, n) => {
          expect(minutesBetween(a, addMinutes(a, n))).toBe(n);
        }
      )
    );
  });

  it("addMinutes is monotonic in n", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4_000_000_000_000 }),
        fc.integer({ min: 0, max: 5_000 }),
        (a, n) => {
          expect(addMinutes(a, n + 1)).toBeGreaterThan(addMinutes(a, n));
        }
      )
    );
  });
});

describe("temporal — clock skew (roadmap §14)", () => {
  it("flags skew above the threshold", () => {
    const network = istToEpochMs("2026-09-12", "20:00");
    const device = addMinutes(network, 3);
    const result = detectClockSkew(device, network, 2);
    expect(result.skewed).toBe(true);
    expect(result.skewMin).toBe(3);
  });

  it("does not flag skew at or below the threshold", () => {
    const network = istToEpochMs("2026-09-12", "20:00");
    const device = addMinutes(network, 2);
    expect(detectClockSkew(device, network, 2).skewed).toBe(false);
  });

  it("returns unskewed when both clocks agree", () => {
    const t = istToEpochMs("2026-09-12", "20:00");
    expect(detectClockSkew(t, t, 2)).toEqual({ skewed: false, skewMin: 0 });
  });
});
