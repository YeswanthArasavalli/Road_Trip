/**
 * TRIP OS — estimation model (roadmap §6, plan Slice 2).
 * Honest uncertainty: status/confidence provenance + 3-point ranges.
 * The conservative bound governs all feasibility (roadmap §6.3).
 * Pure functions only — no clock, no network, no side effects.
 */

export type EstimateStatus = "VERIFIED" | "ESTIMATED" | "UNKNOWN";

export type EstimateConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

/**
 * Three-point range. Bounds are durations in minutes unless documented
 * otherwise by the caller. Invariant: optimistic <= expected <= conservative.
 * Only the conservative bound may drive risk/feasibility decisions (§6.3).
 */
export interface Range {
  optimistic: number;
  expected: number;
  conservative: number;
}

/**
 * A value with honest provenance. UNKNOWN must never silently become
 * precise: a status of UNKNOWN carries a documented conservative
 * assumption, not a fabricated exact value (roadmap §6.1, scenario P).
 */
export interface Estimate<T = number> {
  status: EstimateStatus;
  confidence: EstimateConfidence;
  value?: T;
  range?: Range;
  source?: string;
  retrieved_at?: string; // ISO 8601
}

/**
 * Sum a list of ranges bound-by-bound.
 * Identity: the zero range; associative and commutative.
 */
export function accumulateRange(items: Range[]): Range {
  let optimistic = 0;
  let expected = 0;
  let conservative = 0;
  for (const item of items) {
    optimistic += item.optimistic;
    expected += item.expected;
    conservative += item.conservative;
  }
  return { optimistic, expected, conservative };
}

/**
 * Shift every bound of a range forward by `minutes`.
 * Order of bounds is preserved (optimistic <= expected <= conservative).
 */
export function addMinutesToRange(range: Range, minutes: number): Range {
  return {
    optimistic: range.optimistic + minutes,
    expected: range.expected + minutes,
    conservative: range.conservative + minutes,
  };
}

/**
 * Express a range in minutes. Bounds are already minutes in MVP-A,
 * so this is the identity — it exists as the explicit conversion point
 * if richer units arrive later.
 */
export function rangeMinutes(range: Range): Range {
  return {
    optimistic: range.optimistic,
    expected: range.expected,
    conservative: range.conservative,
  };
}

/**
 * A degenerate (exact) range: all three bounds equal. Use for verified
 * point values; the conservative bound then equals the exact value.
 */
export function rangeFromMinutes(minutes: number): Range {
  return { optimistic: minutes, expected: minutes, conservative: minutes };
}
