/**
 * TRIP OS — fatigue / driver-safety advisory engine (plan Slice 6,
 * roadmap §21). ADVISORY ONLY — configurable operational thresholds,
 * not legal or medical standards. The engine can recommend REST NOW
 * over any attraction; it never recommends driving faster or further
 * to protect itinerary coverage.
 */

import type { Range, TripProjection } from "./index";
import { toIstParts } from "./temporal";

export interface FatigueConfig {
  max_continuous_drive_minutes: number;
  max_drive_minutes_in_24h: number;
  recommended_break_minutes: number;
  night_drive_warning_threshold_minutes: number;
}

export const DEFAULT_FATIGUE_CONFIG: FatigueConfig = {
  max_continuous_drive_minutes: 180,
  max_drive_minutes_in_24h: 600,
  recommended_break_minutes: 20,
  night_drive_warning_threshold_minutes: 180,
};

export interface FatigueBreach {
  rule: "continuous_drive" | "drive_24h" | "night_drive";
  threshold: number;
  actual: number;
  severity: "ADVISORY";
}

export interface FatigueStatus {
  continuous_drive_min: number;
  drive_24h_min: number;
  /** Minutes driven inside 22:00–06:00 IST (trailing 24h window). */
  night_drive_min: number;
  breaches: FatigueBreach[];
  /** True when the safest next action is to rest, not to continue. */
  rest_recommended: boolean;
}

const MS_PER_MINUTE = 60_000;

/** Minutes of [start,end) that fall inside night hours (22:00–06:00 IST). */
function nightMinutes(start: number, end: number): number {
  let night = 0;
  // Walk in <=1h chunks aligned to IST wall clock; cheap and precise
  // enough for advisory purposes.
  let cursor = start;
  while (cursor < end) {
    const step = Math.min(end - cursor, 30 * MS_PER_MINUTE);
    const hour = Number(toIstParts(cursor + step / 2).time.slice(0, 2));
    if (hour >= 22 || hour < 6) night += step;
    cursor += step;
  }
  return Math.round(night / MS_PER_MINUTE);
}

/**
 * Evaluate fatigue from the projection's drive segments. Thresholds are
 * inclusive lower bounds: actual === threshold is a breach (a boundary
 * test pins this at threshold/threshold+1).
 */
export function evaluateFatigue(
  projection: TripProjection,
  config: FatigueConfig = DEFAULT_FATIGUE_CONFIG
): FatigueStatus {
  const tripNow = projection.trip_now ?? 0;
  const segments = projection.drive_segments.map((s) => ({
    ...s,
    end: Number.isFinite(s.end) ? s.end : tripNow,
  }));

  let nightMin = 0;
  const window24h = tripNow - 24 * 60 * MS_PER_MINUTE;
  for (const s of segments) {
    const from = Math.max(s.start, window24h);
    if (s.end > from) nightMin += nightMinutes(from, s.end);
  }

  const c = projection.fatigue_counters;
  const breaches: FatigueBreach[] = [];
  if (c.continuous_drive_min >= config.max_continuous_drive_minutes) {
    breaches.push({
      rule: "continuous_drive",
      threshold: config.max_continuous_drive_minutes,
      actual: c.continuous_drive_min,
      severity: "ADVISORY",
    });
  }
  if (c.drive_24h_min >= config.max_drive_minutes_in_24h) {
    breaches.push({
      rule: "drive_24h",
      threshold: config.max_drive_minutes_in_24h,
      actual: c.drive_24h_min,
      severity: "ADVISORY",
    });
  }
  if (nightMin >= config.night_drive_warning_threshold_minutes) {
    breaches.push({
      rule: "night_drive",
      threshold: config.night_drive_warning_threshold_minutes,
      actual: nightMin,
      severity: "ADVISORY",
    });
  }

  return {
    continuous_drive_min: c.continuous_drive_min,
    drive_24h_min: c.drive_24h_min,
    night_drive_min: nightMin,
    breaches,
    // Scenario L: any breach means REST NOW outranks the next attraction.
    rest_recommended: breaches.length > 0,
  };
}

export interface RestAdvisory {
  action: "REST" | "BREAK_SOON" | "OK";
  message: string;
}

/** Advisory wording only — never prescriptive, never medical. */
export function restRecommendation(fatigue: FatigueStatus): RestAdvisory {
  if (fatigue.breaches.length > 0) {
    const first = fatigue.breaches[0]!;
    return {
      action: "REST",
      message:
        `Consider resting now. Driving so far: ${fatigue.continuous_drive_min} min continuous, ` +
        `${fatigue.drive_24h_min} min in 24h (advisory limit reached on ${first.rule}: ` +
        `${first.actual} of ${first.threshold} min). Continuing increases operational risk.`,
    };
  }
  const nearLimit =
    fatigue.continuous_drive_min >= DEFAULT_FATIGUE_CONFIG.max_continuous_drive_minutes - 30 ||
    fatigue.drive_24h_min >= DEFAULT_FATIGUE_CONFIG.max_drive_minutes_in_24h - 60;
  if (nearLimit) {
    return {
      action: "BREAK_SOON",
      message: "A break in the next little while would help keep the drive comfortable.",
    };
  }
  return { action: "OK", message: "Driving load is within the configured advisory limits." };
}

/**
 * Insert advisory break minutes into a leg's range for planning: one
 * recommended break per max_continuous threshold crossed. Legs whose
 * seed assumption already includes breaks are returned unchanged —
 * double-counting rest would overstate the conservative bound.
 */
export function applyFatigueToPlan(
  range: Range,
  legAssumption: string,
  config: FatigueConfig = DEFAULT_FATIGUE_CONFIG
): Range {
  // Legs whose assumption says breaks are already included (in any
  // wording — "breaks included", "includes fatigue breaks", …) are
  // returned unchanged: double-counting rest would overstate the bound.
  if (/\bbreak/i.test(legAssumption) && /includ/i.test(legAssumption)) return range;
  const breaksFor = (minutes: number): number =>
    Math.floor(Math.max(0, minutes - 1) / config.max_continuous_drive_minutes) *
    config.recommended_break_minutes;
  return {
    optimistic: range.optimistic + breaksFor(range.optimistic),
    expected: range.expected + breaksFor(range.expected),
    conservative: range.conservative + breaksFor(range.conservative),
  };
}
