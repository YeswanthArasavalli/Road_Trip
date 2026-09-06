/**
 * TRIP OS — roadmap engine (plan Slice 5, roadmap §17/§18).
 * Deterministic: given the same projection, seed, config and `now`, the
 * result is identical. ETAs are three-point ranges; risk uses ONLY the
 * conservative bound (§6.3 — there is no code path where an optimistic
 * value improves the risk class). All strings are advisory language.
 */

import type { TripSeed } from "@trip-os/seed-data";
import {
  addMinutes,
  classifyRisk,
  deadlineBuffer,
  type Range,
  type RiskLevel,
  type RiskThresholds,
  type TripProjection,
} from "./index";
import { applyFatigueToPlan, type FatigueConfig } from "./constraints";

export interface RoadmapConfig {
  /** Hard deadline, epoch ms. */
  deadline: number;
  thresholds: RiskThresholds;
  fatigue: FatigueConfig;
}

/** Wall-clock three-point ETA (epoch ms per bound). */
export interface EtaRange {
  optimistic: number;
  expected: number;
  conservative: number;
}

export interface LegPlan {
  from: string;
  to: string;
  route_duration: Range;
  /** Break minutes inserted for fatigue (advisory; already-inclusive legs skipped). */
  inserted_break_minutes: number;
}

export interface StopPlanEntry {
  node_id: string;
  /** Planned arrival/departure wall-clock ranges (epoch ms). */
  arrival_range: EtaRange;
  departure_range: EtaRange;
  visit_minutes: Range | null;
  skipped: boolean;
  /** RETURN_WAYPOINT: drive-through recommended under deadline pressure. */
  degrade_recommended: boolean;
}

export interface RoadmapResult {
  legs: LegPlan[];
  stop_plan: StopPlanEntry[];
  home_eta_range: EtaRange;
  conservative_remaining_minutes: number;
  buffer_minutes: number;
  risk: RiskLevel;
  /** Human-readable conservative deadline violations. */
  infeasible_flags: string[];
  progress: { completed: number; total: number };
  /** Latest departure from the current position keeping buffer >= 0. */
  latest_safe_departure: number;
  current_node_id: string | null;
  next_node_id: string | null;
}

function etaAt(base: number, r: Range): EtaRange {
  return {
    optimistic: addMinutes(base, r.optimistic),
    expected: addMinutes(base, r.expected),
    conservative: addMinutes(base, r.conservative),
  };
}

function addRange(a: Range, b: Range): Range {
  return {
    optimistic: a.optimistic + b.optimistic,
    expected: a.expected + b.expected,
    conservative: a.conservative + b.conservative,
  };
}

const ZERO: Range = { optimistic: 0, expected: 0, conservative: 0 };

/**
 * Index of the route frontier: the first node not yet COMPLETED/SKIPPED.
 * The route is ordered, so a later skip never advances the frontier past
 * an earlier pending stop. Returns the HOME index when all is done.
 */
export function currentRouteIndex(projection: TripProjection, seed: TripSeed): number {
  for (let i = 0; i < seed.route.length; i++) {
    const status = projection.nodes[seed.route[i]!.id]?.status ?? "PENDING";
    if (status !== "COMPLETED" && status !== "SKIPPED") return i;
  }
  return seed.route.length - 1;
}

interface PlanTotals {
  stop_plan: StopPlanEntry[];
  legs: LegPlan[];
  conservative_minutes: number;
  expected_minutes: number;
  optimistic_minutes: number;
}

/**
 * Build the forward plan from `startIdx`. Pure — used both for the real
 * roadmap and for what-if/degrade comparisons.
 */
function planFrom(
  seed: TripSeed,
  projection: TripProjection,
  config: RoadmapConfig,
  startEpoch: number,
  startIdx: number,
  waypointDriveThrough: boolean
): PlanTotals {
  const stops: StopPlanEntry[] = [];
  const legs: LegPlan[] = [];
  let elapsed: Range = { ...ZERO };

  for (let i = startIdx; i < seed.route.length; i++) {
    const node = seed.route[i]!;
    const status = projection.nodes[node.id]?.status ?? "PENDING";
    const isWaypoint = node.role === "RETURN_WAYPOINT";
    const skipped = status === "SKIPPED";
    const degrade = isWaypoint && waypointDriveThrough;

    // Leg into this node (none for the first planned node).
    if (i > startIdx) {
      const leg = seed.legs[i - 1]!;
      const withBreaks = applyFatigueToPlan(leg.duration.range, leg.duration.assumption ?? "", config.fatigue);
      legs.push({
        from: leg.from,
        to: leg.to,
        route_duration: leg.duration.range,
        inserted_break_minutes:
          withBreaks.conservative - leg.duration.range.conservative,
      });
      elapsed = addRange(elapsed, withBreaks);
    }

    const arrival = etaAt(startEpoch, elapsed);

    // Visit time: completed/skipped/waypoint-degraded nodes contribute zero.
    let visit: Range | null = null;
    if (!skipped && !degrade && node.visit && status !== "COMPLETED") {
      visit = node.visit.range;
    }
    if (visit) elapsed = addRange(elapsed, visit);

    stops.push({
      node_id: node.id,
      arrival_range: arrival,
      departure_range: etaAt(startEpoch, elapsed),
      visit_minutes: visit,
      skipped,
      degrade_recommended: degrade,
    });
  }

  return {
    stop_plan: stops,
    legs,
    conservative_minutes: elapsed.conservative,
    expected_minutes: elapsed.expected,
    optimistic_minutes: elapsed.optimistic,
  };
}

/**
 * Compute the live roadmap. `now` is injected (epoch ms) — the engine
 * never reads a clock. The plan starts at max(now, delay_horizon) from
 * the current route position: a recorded delay pushes the plan start
 * conservatively later until the wall clock absorbs it. Visits already
 * COMPLETED contribute nothing further.
 */
export function computeRoadmap(
  projection: TripProjection,
  seed: TripSeed,
  config: RoadmapConfig,
  now: number
): RoadmapResult {
  const startEpoch = Math.max(now, projection.delay_horizon ?? 0);
  const startIdx = currentRouteIndex(projection, seed);
  const full = planFrom(seed, projection, config, startEpoch, startIdx, false);

  const homeStop = full.stop_plan[full.stop_plan.length - 1];
  const homeEta: EtaRange = homeStop
    ? homeStop.arrival_range
    : { optimistic: startEpoch, expected: startEpoch, conservative: startEpoch };

  const buffer = deadlineBuffer(startEpoch, homeEta.conservative, config.deadline);
  const risk = classifyRisk(buffer, config.thresholds);

  // Waypoint degrade: recommend Vijayawada drive-through when the full
  // visit plan is CRITICAL/IMPOSSIBLE and driving through improves the
  // risk class. Deterministic comparison, conservative bounds only.
  let degradeRecommended = false;
  if (risk === "CRITICAL" || risk === "IMPOSSIBLE") {
    const degraded = planFrom(seed, projection, config, startEpoch, startIdx, true);
    const degradedBuffer = deadlineBuffer(
      startEpoch,
      addMinutes(startEpoch, degraded.conservative_minutes),
      config.deadline
    );
    const degradedRisk = classifyRisk(degradedBuffer, config.thresholds);
    degradeRecommended = degradedRisk !== risk && degradedBuffer >= 0;
  }

  const flags: string[] = [];
  if (risk === "IMPOSSIBLE") {
    flags.push(
      `Conservative home arrival is ${Math.abs(buffer)} min after the hard deadline. The plan needs changes (skip optional stops, shorten visits, or accept a later arrival).`
    );
  }
  if (risk === "CRITICAL") {
    flags.push(
      "Conservative buffer is under 30 minutes. Any further delay likely breaks the deadline."
    );
  }

  const completed = seed.route.filter(
    (n) => (projection.nodes[n.id]?.status ?? "PENDING") === "COMPLETED"
  ).length;
  const total = seed.route.filter((n) => n.role !== "HOME").length;

  const current =
    seed.route[startIdx] && (projection.nodes[seed.route[startIdx]!.id]?.status === "ACTIVE")
      ? seed.route[startIdx]!.id
      : null;
  const nextIdx = current ? startIdx + 1 : startIdx;
  const next = nextIdx < seed.route.length ? seed.route[nextIdx]!.id : null;

  return {
    legs: full.legs,
    stop_plan: full.stop_plan,
    home_eta_range: homeEta,
    conservative_remaining_minutes: full.conservative_minutes,
    buffer_minutes: buffer,
    risk,
    infeasible_flags: flags,
    progress: { completed, total },
    latest_safe_departure: addMinutes(config.deadline, -full.conservative_minutes),
    current_node_id: current,
    next_node_id: next,
  };
}

/**
 * What-if: recompute with the same events plus a hypothetical extra
 * delay (minutes) applied to `now`. Returns a fresh RoadmapResult —
 * the real trip state is never touched (roadmap §24).
 */
export function simulateDelay(
  projection: TripProjection,
  seed: TripSeed,
  config: RoadmapConfig,
  now: number,
  delayMinutes: number
): RoadmapResult {
  return computeRoadmap(projection, seed, config, addMinutes(now, delayMinutes));
}
