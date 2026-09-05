/**
 * TRIP OS — deadline engine (roadmap §7, plan Slice 2).
 * Feasibility and risk are derived from the CONSERVATIVE bound only.
 * Optimistic/expected values never enter risk classification (§6.3):
 * classifyRisk takes a single number — the conservative buffer — and
 * structurally has no access to any other bound.
 * Pure functions; `now` and `deadline` are always injected epoch-ms.
 */

import { addMinutes } from "./temporal";
import { accumulateRange, type Range } from "./estimates";

export const RiskLevel = {
  SAFE: "SAFE",
  TIGHT: "TIGHT",
  AT_RISK: "AT_RISK",
  CRITICAL: "CRITICAL",
  IMPOSSIBLE: "IMPOSSIBLE",
} as const;

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

/**
 * Application policy thresholds (roadmap §7) — configurable, expressed in
 * minutes of CONSERVATIVE buffer. Boundaries are inclusive at the lower
 * class: buffer === safeMaxMinutes is TIGHT, buffer === tightMaxMinutes
 * is AT_RISK, buffer === atRiskMaxMinutes is CRITICAL.
 */
export interface RiskThresholds {
  safeMaxMinutes: number;
  tightMaxMinutes: number;
  atRiskMaxMinutes: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  safeMaxMinutes: 180,
  tightMaxMinutes: 90,
  atRiskMaxMinutes: 30,
};

/**
 * Minutes between the conservative ETA and the deadline.
 * Positive = slack remains; negative = conservative arrival crosses
 * the deadline (IMPOSSIBLE territory). `now` is accepted for interface
 * stability (roadmap §7) and provenance; the buffer itself is fully
 * determined by conservativeEta and deadline.
 */
export function deadlineBuffer(
  now: number,
  conservativeEta: number,
  deadline: number
): number {
  // Deliberately pure arithmetic; `now` unused by design (see doc above).
  void now;
  return Math.round((deadline - conservativeEta) / 60_000);
}

/**
 * Classify risk from the CONSERVATIVE buffer only.
 * Single numeric input — there is no optimistic parameter to consult,
 * so no optimistic value can ever make an unsafe plan look safe (§6.3).
 */
export function classifyRisk(
  bufferMin: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): RiskLevel {
  if (bufferMin < 0) return RiskLevel.IMPOSSIBLE;
  if (bufferMin <= thresholds.atRiskMaxMinutes) return RiskLevel.CRITICAL;
  if (bufferMin <= thresholds.tightMaxMinutes) return RiskLevel.AT_RISK;
  if (bufferMin <= thresholds.safeMaxMinutes) return RiskLevel.TIGHT;
  return RiskLevel.SAFE;
}

export interface CanAbsorbDelayInput {
  /** Current buffer derived from the conservative ETA. */
  conservativeBufferNow: number;
  extraDelayMinutes: number;
  /** Injected deadline (epoch ms) — kept for call-site clarity. */
  deadline: number;
}

export interface AbsorbDelayResult {
  feasible: boolean;
  resulting_risk: RiskLevel;
}

/**
 * Can the plan absorb an extra delay and still not cross the deadline
 * under the CONSERVATIVE estimate? Feasible means the resulting
 * conservative buffer stays >= 0 (CRITICAL at worst, never IMPOSSIBLE).
 */
export function canAbsorbDelay(input: CanAbsorbDelayInput): AbsorbDelayResult {
  const resultingBuffer = input.conservativeBufferNow - input.extraDelayMinutes;
  const resulting_risk = classifyRisk(resultingBuffer);
  return { feasible: resultingBuffer >= 0, resulting_risk };
}

export interface LatestSafeDepartureInput {
  now: number;
  /** Remaining trip time under the CONSERVATIVE estimate, in minutes. */
  conservativeRemainingMinutes: number;
  deadline: number;
}

/**
 * The latest departure epoch that keeps the conservative buffer >= 0:
 * deadline - conservativeRemainingMinutes. If the result is earlier than
 * `now`, departure is already overdue — surfaced as-is, never clamped.
 */
export function latestSafeDeparture(input: LatestSafeDepartureInput): number {
  return addMinutes(input.deadline, -input.conservativeRemainingMinutes);
}

export interface RequiredDepartureInput {
  fromNode: string;
  deadline: number;
  conservativeRemainingMinutes: number;
}

/**
 * Same arithmetic as latestSafeDeparture, phrased per-node: the time the
 * trip must leave `fromNode` so the conservative remaining route still
 * meets the deadline. `fromNode` is descriptive; the math is deadline-
 * driven. If no such time is reachable in the future, the returned
 * epoch is in the past — the caller renders that honestly.
 */
export function requiredDepartureTime(input: RequiredDepartureInput): number {
  return addMinutes(input.deadline, -input.conservativeRemainingMinutes);
}

/**
 * Project the home-arrival duration range (minutes) by accumulating
 * all leg and stop ranges. Bounds stay independent: the conservative
 * total is the only value allowed to govern feasibility (§6.3) —
 * consumers must call classifyRisk on the conservative bound alone.
 * Wall-clock ETAs are derived by the caller via addMinutes(departure, bound).
 */
export function projectHomeEta(legsAndStops: Range[]): Range {
  return accumulateRange(legsAndStops);
}
