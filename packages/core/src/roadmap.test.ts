/**
 * Slice 5+6 tests — roadmap engine, fatigue advisories, scenario suite
 * (roadmap §30). Scenario O is structural: risk depends only on the
 * conservative buffer. Scenario L: fatigue → REST outranks attraction.
 */

import { describe, it, expect } from "vitest";
import {
  computeRoadmap,
  simulateDelay,
  currentRouteIndex,
  type RoadmapConfig,
} from "./roadmap";
import {
  evaluateFatigue,
  restRecommendation,
  applyFatigueToPlan,
  DEFAULT_FATIGUE_CONFIG,
} from "./constraints";
import { rebuildProjection, type TripProjection } from "./state";
import { diffPlans } from "./plan-diff";
import { riskWording, fmtMinutes } from "./humanize";
import { TripEventSchema, trip2026_09, type TripEvent } from "@trip-os/seed-data";
import { classifyRisk, RiskLevel } from "./deadline";

const DEADLINE = Date.parse("2026-09-13T03:00:00+05:30");
const config: RoadmapConfig = {
  deadline: DEADLINE,
  thresholds: { safeMaxMinutes: 180, tightMaxMinutes: 90, atRiskMaxMinutes: 30 },
  fatigue: DEFAULT_FATIGUE_CONFIG,
};

let seq = 0;
function ev(partial: Record<string, unknown> & { type: string; actual_event_time: string }): TripEvent {
  seq += 1;
  return TripEventSchema.parse({
    ...partial,
    recorded_at: partial.recorded_at ?? partial.actual_event_time,
    source: partial.source ?? "USER",
    event_id: partial.event_id ?? `e${String(seq).padStart(4, "0")}`,
  });
}

const NOW = Date.parse("2026-09-06T21:00:00+05:30");

const seedIds = trip2026_09.route.map((n) => n.id);

function proj(events: TripEvent[] = []): TripProjection {
  return rebuildProjection(events, seedIds);
}

describe("computeRoadmap on the real seed", () => {
  it("plans all 10 legs from Srikalahasti with three-point home ETA", () => {
    seq = 0;
    const rm = computeRoadmap(proj(), trip2026_09, config, NOW);
    expect(rm.legs).toHaveLength(10);
    expect(rm.stop_plan).toHaveLength(11);
    expect(rm.home_eta_range.conservative).toBeGreaterThan(rm.home_eta_range.expected);
    expect(rm.home_eta_range.expected).toBeGreaterThan(rm.home_eta_range.optimistic);
    // Srikalahasti is the first stop (user-corrected order).
    expect(rm.stop_plan[0]!.node_id).toBe("srikalahasti");
    expect(rm.next_node_id).toBe("srikalahasti");
  });

  it("conservative remaining > 24h before any visit: overnight rest is part of the model", () => {
    const rm = computeRoadmap(proj(), trip2026_09, config, NOW);
    expect(rm.conservative_remaining_minutes).toBeGreaterThan(24 * 60);
  });

  it("completed nodes drop out of the forward plan", () => {
    seq = 0;
    const events = [
      ev({ type: "ARRIVED", node_id: "srikalahasti", actual_event_time: "2026-09-07T05:00:00+05:30" }),
      ev({
        type: "DESTINATION_COMPLETED",
        node_id: "srikalahasti",
        actual_duration_minutes: 100,
        actual_event_time: "2026-09-07T07:00:00+05:30",
      }),
    ];
    const rm = computeRoadmap(proj(events), trip2026_09, config, Date.parse("2026-09-07T07:00:00+05:30"));
    expect(rm.stop_plan[0]!.node_id).toBe("tirupati");
    expect(rm.legs).toHaveLength(9);
    expect(rm.progress.completed).toBe(1);
  });

  it("risk worsens monotonically as `now` moves later (delays never help)", () => {
    const order: RiskLevel[] = ["SAFE", "TIGHT", "AT_RISK", "CRITICAL", "IMPOSSIBLE"];
    const rmAt = (t: string) => computeRoadmap(proj(), trip2026_09, config, Date.parse(t));
    let prevRank = -1;
    for (const t of [
      "2026-09-06T21:00:00+05:30",
      "2026-09-08T00:00:00+05:30",
      "2026-09-09T12:00:00+05:30",
      "2026-09-10T12:00:00+05:30",
      "2026-09-11T12:00:00+05:30",
    ]) {
      const r = rmAt(t).risk;
      const rank = order.indexOf(r);
      expect(rank).toBeGreaterThanOrEqual(prevRank);
      prevRank = rank;
    }
  });

  it("flags IMPOSSIBLE with a human reason when conservative misses the deadline", () => {
    const late = Date.parse("2026-09-11T18:00:00+05:30");
    const rm = computeRoadmap(proj(), trip2026_09, config, late);
    if (rm.risk === "IMPOSSIBLE") {
      expect(rm.infeasible_flags.length).toBeGreaterThan(0);
      expect(rm.infeasible_flags[0]).toMatch(/deadline/i);
    }
  });

  it("skipping destinations reduces conservative remaining time (sacrifice chain works)", () => {
    seq = 0;
    const withAll = computeRoadmap(proj(), trip2026_09, config, NOW);
    const skipped = proj([
      ev({ type: "DESTINATION_SKIPPED", node_id: "kanipakam", reason: "pressure", actual_event_time: "2026-09-07T05:00:00+05:30" }),
      ev({ type: "DESTINATION_SKIPPED", node_id: "tiruttani", reason: "pressure", actual_event_time: "2026-09-07T05:01:00+05:30" }),
    ]);
    const without = computeRoadmap(skipped, trip2026_09, config, NOW);
    expect(without.conservative_remaining_minutes).toBeLessThan(withAll.conservative_remaining_minutes);
    expect(without.stop_plan.find((s) => s.node_id === "kanipakam")!.skipped).toBe(true);
  });
});

describe("delay horizon (recorded delays shift the plan until absorbed)", () => {
  it("a 30-min DELAY_ADDED at NOW shifts the conservative home ETA by exactly +30 min", () => {
    seq = 0;
    const base = computeRoadmap(proj(), trip2026_09, config, NOW);
    const delayed = computeRoadmap(
      proj([
        ev({ type: "DELAY_ADDED", amount_minutes: 30, reason: "traffic", actual_event_time: "2026-09-06T21:00:00+05:30" }),
      ]),
      trip2026_09,
      config,
      NOW
    );
    expect(delayed.home_eta_range.conservative).toBe(base.home_eta_range.conservative + 30 * 60_000);
    expect(delayed.buffer_minutes).toBe(base.buffer_minutes - 30);
  });

  it("the delay backlog is absorbed once the wall clock passes the horizon (no double count)", () => {
    seq = 0;
    const delayedProj = proj([
      ev({ type: "DELAY_ADDED", amount_minutes: 30, reason: "traffic", actual_event_time: "2026-09-06T21:00:00+05:30" }),
    ]);
    // 30-min delay at 21:00 → horizon 21:30; at 23:00 the wall clock has
    // fully absorbed it, so the plan equals a delay-free plan at 23:00.
    const atAbsorbed = computeRoadmap(delayedProj, trip2026_09, config, NOW + 120 * 60_000);
    const fresh = computeRoadmap(proj(), trip2026_09, config, NOW + 120 * 60_000);
    expect(atAbsorbed.home_eta_range.conservative).toBe(fresh.home_eta_range.conservative);
    expect(atAbsorbed.buffer_minutes).toBe(fresh.buffer_minutes);
  });
});

describe("scenario O — no optimistic input can flip risk (structural)", () => {
  it("classifyRisk arity: a single conservative number decides the class", () => {
    // The risk function takes exactly one number; there is no optimistic
    // parameter in its signature to abuse (compile-time structural fact).
    expect(classifyRisk(-1)).toBe("IMPOSSIBLE");
    expect(classifyRisk(20)).toBe("CRITICAL");
    expect(classifyRisk(60)).toBe("AT_RISK");
    expect(classifyRisk(120)).toBe("TIGHT");
    expect(classifyRisk(400)).toBe("SAFE");
  });

  it("a huge optimistic ETA cannot improve the computed roadmap risk", () => {
    const rm = computeRoadmap(proj(), trip2026_09, config, NOW);
    // The result exposes home_eta_range (3 bounds) but risk was computed
    // from conservative only — assert the invariant directly:
    const buffer = Math.round((DEADLINE - rm.home_eta_range.conservative) / 60_000);
    expect(rm.buffer_minutes).toBe(buffer);
    expect(rm.risk).toBe(classifyRisk(buffer, config.thresholds));
  });
});

describe("scenario P / Q — unknown stays unknown; delay is auditable", () => {
  it("UNKNOWN visit estimates keep a range + assumption (never a precise value)", () => {
    for (const node of trip2026_09.route) {
      if (node.visit?.status === "UNKNOWN") {
        expect(node.visit.value).toBeUndefined();
        expect(node.visit.assumption).toBeTruthy();
      }
    }
  });

  it("simulateDelay returns a worse-or-equal risk without touching the projection", () => {
    const p = proj();
    const snapshot = JSON.stringify(p);
    const base = computeRoadmap(p, trip2026_09, config, NOW);
    const delayed = simulateDelay(p, trip2026_09, config, NOW, 120);
    const order: RiskLevel[] = ["SAFE", "TIGHT", "AT_RISK", "CRITICAL", "IMPOSSIBLE"];
    expect(order.indexOf(delayed.risk)).toBeGreaterThanOrEqual(order.indexOf(base.risk));
    expect(JSON.stringify(p)).toBe(snapshot);
  });
});

describe("fatigue engine (slice 6)", () => {
  const drive = (startIso: string, endIso: string, extra: TripEvent[] = []): TripProjection => {
    seq = 0;
    return rebuildProjection(
      [
        ev({ type: "DEPARTED", node_id: "narsapuram", actual_event_time: startIso }),
        ...extra,
        ev({ type: "ARRIVED", node_id: "srikalahasti", actual_event_time: endIso }),
      ],
      seedIds
    );
  };

  it("boundary: 179 min continuous is OK, 180 is a breach, 181 is a breach", () => {
    const ok = evaluateFatigue(drive("2026-09-06T20:00:00+05:30", "2026-09-06T22:59:00+05:30"));
    expect(ok.continuous_drive_min).toBe(179);
    expect(ok.breaches).toHaveLength(0);
    const at = evaluateFatigue(drive("2026-09-06T20:00:00+05:30", "2026-09-06T23:00:00+05:30"));
    expect(at.continuous_drive_min).toBe(180);
    expect(at.breaches.some((b) => b.rule === "continuous_drive")).toBe(true);
    const over = evaluateFatigue(drive("2026-09-06T20:00:00+05:30", "2026-09-06T23:01:00+05:30"));
    expect(over.breaches.some((b) => b.rule === "continuous_drive")).toBe(true);
  });

  it("configurable threshold: raising the limit clears the breach", () => {
    const p = drive("2026-09-06T20:00:00+05:30", "2026-09-06T23:00:00+05:30");
    const strict = evaluateFatigue(p, DEFAULT_FATIGUE_CONFIG);
    const relaxed = evaluateFatigue(p, { ...DEFAULT_FATIGUE_CONFIG, max_continuous_drive_minutes: 240 });
    expect(strict.breaches).toHaveLength(1);
    expect(relaxed.breaches).toHaveLength(0);
  });

  it("24h threshold breaches at 600 minutes", () => {
    // 6h drive, rest, 4h drive = 600 total in 24h.
    seq = 0;
    const p = rebuildProjection(
      [
        ev({ type: "DEPARTED", node_id: "narsapuram", actual_event_time: "2026-09-06T20:00:00+05:30" }),
        ev({ type: "REST_STARTED", actual_event_time: "2026-09-07T02:00:00+05:30" }),
        ev({ type: "REST_COMPLETED", duration_minutes: 30, actual_event_time: "2026-09-07T02:30:00+05:30" }),
        ev({ type: "ARRIVED", node_id: "srikalahasti", actual_event_time: "2026-09-07T06:30:00+05:30" }),
      ],
      seedIds
    );
    const f = evaluateFatigue(p);
    expect(f.drive_24h_min).toBe(600);
    expect(f.breaches.some((b) => b.rule === "drive_24h")).toBe(true);
  });

  it("scenario L: fatigue breach → REST recommendation outranks the next attraction", () => {
    const p = drive("2026-09-06T20:00:00+05:30", "2026-09-06T23:30:00+05:30");
    const f = evaluateFatigue(p);
    expect(f.rest_recommended).toBe(true);
    const rec = restRecommendation(f);
    expect(rec.action).toBe("REST");
    expect(rec.message).toMatch(/rest/i);
  });

  it("applyFatigueToPlan inserts one break per threshold crossed, skips legs that already include breaks", () => {
    const r = { optimistic: 100, expected: 200, conservative: 400 };
    const withBreaks = applyFatigueToPlan(r, "planner judgment", DEFAULT_FATIGUE_CONFIG);
    // 200 min → floor(199/180)=1 break; 400 → floor(399/180)=2 breaks.
    expect(withBreaks.expected).toBe(220);
    expect(withBreaks.conservative).toBe(440);
    const inclusive = applyFatigueToPlan(
      { optimistic: 840, expected: 990, conservative: 1200 },
      "conservative 20h includes fatigue breaks",
      DEFAULT_FATIGUE_CONFIG
    );
    expect(inclusive.conservative).toBe(1200); // unchanged — no double count
  });
});

describe("plan-diff + advisory language", () => {
  it("diffPlans explains an ETA/risk change from deterministic data", () => {
    const before = computeRoadmap(proj(), trip2026_09, config, NOW);
    const after = computeRoadmap(proj(), trip2026_09, config, NOW + 90 * 60_000);
    const d = diffPlans(before, after, "a 90-minute delay");
    expect(d.changes.length).toBeGreaterThan(0);
    expect(d.reason).toContain("90-minute delay");
  });

  it("banned words never appear in user-facing strings", () => {
    const texts = [
      ...[RiskLevel.SAFE, RiskLevel.TIGHT, RiskLevel.AT_RISK, RiskLevel.CRITICAL, RiskLevel.IMPOSSIBLE].map((r) =>
        riskWording(r, 100)
      ),
      restRecommendation({ continuous_drive_min: 200, drive_24h_min: 300, night_drive_min: 0, breaches: [{ rule: "continuous_drive", threshold: 180, actual: 200, severity: "ADVISORY" }], rest_recommended: true }).message,
      restRecommendation({ continuous_drive_min: 10, drive_24h_min: 20, night_drive_min: 0, breaches: [], rest_recommended: false }).message,
      fmtMinutes(95),
    ];
    for (const t of texts) {
      expect(t).not.toMatch(/guaranteed|medically|certified/i);
    }
  });
});
