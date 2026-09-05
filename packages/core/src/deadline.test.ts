import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  deadlineBuffer,
  classifyRisk,
  canAbsorbDelay,
  latestSafeDeparture,
  requiredDepartureTime,
  DEFAULT_RISK_THRESHOLDS,
  RiskLevel,
} from "./deadline";
import { istToEpochMs, addMinutes } from "./temporal";

const DEADLINE = istToEpochMs("2026-09-13", "03:00");
const SEPT12_2000 = istToEpochMs("2026-09-12", "20:00");

describe("deadline — buffer", () => {
  it("computes minutes between conservative ETA and deadline", () => {
    // conservative ETA 22:00 on Sept 12 -> deadline 03:00 Sept 13 = 5h = 300min
    expect(deadlineBuffer(SEPT12_2000, addMinutes(SEPT12_2000, 120), DEADLINE)).toBe(300);
  });

  it("returns negative buffer when conservative ETA crosses the deadline", () => {
    const cons = istToEpochMs("2026-09-13", "03:30");
    expect(deadlineBuffer(SEPT12_2000, cons, DEADLINE)).toBe(-30);
  });
});

describe("deadline — risk classification boundaries (roadmap §7)", () => {
  // thresholds: SAFE > 180, TIGHT 90–180, AT_RISK 30–90, CRITICAL < 30, IMPOSSIBLE < 0
  it("classifies exact boundary values", () => {
    expect(classifyRisk(181)).toBe(RiskLevel.SAFE);
    expect(classifyRisk(180)).toBe(RiskLevel.TIGHT);
    expect(classifyRisk(91)).toBe(RiskLevel.TIGHT);
    expect(classifyRisk(90)).toBe(RiskLevel.AT_RISK);
    expect(classifyRisk(31)).toBe(RiskLevel.AT_RISK);
    expect(classifyRisk(30)).toBe(RiskLevel.CRITICAL);
    expect(classifyRisk(29)).toBe(RiskLevel.CRITICAL);
    expect(classifyRisk(0)).toBe(RiskLevel.CRITICAL);
    expect(classifyRisk(-1)).toBe(RiskLevel.IMPOSSIBLE);
  });

  it("classifyRisk is a pure function of the buffer argument only — it cannot consult optimistic values", () => {
    // Structural guarantee (roadmap §6.3/§6.4): the signature takes a single
    // number. There is no optimistic parameter to consult.
    expect(classifyRisk.length).toBeLessThanOrEqual(2);
  });

  it("accepts custom thresholds", () => {
    const custom = { ...DEFAULT_RISK_THRESHOLDS, safeMaxMinutes: 60, tightMaxMinutes: 30 };
    expect(classifyRisk(120, custom)).toBe(RiskLevel.SAFE);
  });
});

describe("deadline — canAbsorbDelay", () => {
  it("an extra 45 min that keeps positive buffer is absorbable", () => {
    const r = canAbsorbDelay({
      conservativeBufferNow: 200,
      extraDelayMinutes: 45,
      deadline: DEADLINE,
    });
    expect(r.feasible).toBe(true);
    expect(r.resulting_risk).toBe(RiskLevel.TIGHT);
  });

  it("an extra delay that crosses the deadline is not absorbable", () => {
    const r = canAbsorbDelay({
      conservativeBufferNow: 20,
      extraDelayMinutes: 45,
      deadline: DEADLINE,
    });
    expect(r.feasible).toBe(false);
    expect(r.resulting_risk).toBe(RiskLevel.IMPOSSIBLE);
  });
});

describe("deadline — latestSafeDeparture / requiredDepartureTime", () => {
  it("latest departure keeps a positive buffer at the deadline", () => {
    const latest = latestSafeDeparture({
      now: SEPT12_2000,
      conservativeRemainingMinutes: 300,
      deadline: DEADLINE,
    });
    // must leave no later than deadline - 300min = 22:00 Sept 12
    expect(latest).toBe(addMinutes(DEADLINE, -300));
  });

  it("requiredDepartureTime matches latestSafeDeparture semantics", () => {
    const a = latestSafeDeparture({
      now: SEPT12_2000,
      conservativeRemainingMinutes: 420,
      deadline: DEADLINE,
    });
    const b = requiredDepartureTime({
      fromNode: "rameswaram",
      deadline: DEADLINE,
      conservativeRemainingMinutes: 420,
    });
    expect(b).toBe(a);
  });

  it("required departure before the deadline across midnight", () => {
    const latest = requiredDepartureTime({
      fromNode: "rameswaram",
      deadline: DEADLINE,
      conservativeRemainingMinutes: 620, // > 10h drive back
    });
    // deadline 03:00 Sept 13 minus 620min = 16:40 Sept 12
    expect(toIstParts(addMinutes(latest, 0)).time).toBe("16:40");
  });
});

describe("deadline — property tests", () => {
  it("buffer stays consistent under time shifts", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (n) => {
        const now = SEPT12_2000;
        const eta = addMinutes(now, n);
        const b = deadlineBuffer(now, eta, DEADLINE);
        const expected = Math.round((DEADLINE - eta) / 60000);
        expect(b).toBe(expected);
      })
    );
  });
});

// local helper re-import to avoid cluttering the top import list
import { toIstParts } from "./temporal";
