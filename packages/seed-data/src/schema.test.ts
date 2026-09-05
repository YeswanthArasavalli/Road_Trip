/**
 * Slice 3 tests — schema invariants for the seed (plan §Slice 3).
 * Each rejection mirrors a demand in the plan: missing HOME, zero
 * destinations, negative durations, estimate missing status/confidence,
 * UNKNOWN presented as a precise verified value.
 */

import { describe, it, expect } from "vitest";
import { TripSeedSchema } from "./schema";
import { trip2026_09 } from "./trip-2026-09";

/** A minimal valid seed, mutated per test — keeps failures single-cause. */
const baseSeed = {
  seed_id: "test-seed",
  timezone: "Asia/Kolkata",
  hard_deadline: "2026-09-13T03:00:00+05:30",
  route: [
    {
      id: "dest",
      name: "A Destination",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 1,
      mandatory: true,
    },
    {
      id: "home",
      name: "Home",
      node_type: "HOME",
      role: "HOME",
      priority: 2,
      mandatory: true,
    },
  ],
  legs: [
    {
      from: "dest",
      to: "home",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 30, expected: 45, conservative: 60 },
      },
    },
  ],
  daily_routine_blocks: ["BATH", "FOOD"],
  risk_thresholds: {
    safe_max_minutes: 180,
    tight_max_minutes: 90,
    at_risk_max_minutes: 30,
  },
  fatigue: {
    max_continuous_drive_minutes: 180,
    max_drive_minutes_in_24h: 600,
    recommended_break_minutes: 20,
    night_drive_warning_threshold_minutes: 180,
  },
};

/** Deep-clone + override — never mutate the shared base. */
const seed = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  ...structuredClone(baseSeed),
  ...overrides,
});

const estimate = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  status: "ESTIMATED",
  confidence: "MEDIUM",
  range: { optimistic: 30, expected: 45, conservative: 60 },
  ...over,
});

describe("TripSeedSchema rejections (data honesty)", () => {
  it("rejects a route with no HOME node", () => {
    const noHome = seed({
      route: baseSeed.route.map((n) =>
        n.id === "home"
          ? {
              ...n,
              node_type: "DESTINATION" as const,
              role: "MANDATORY_DESTINATION" as const,
              mandatory: true,
            }
          : n
      ),
    });
    const result = TripSeedSchema.safeParse(noHome);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("HOME"))).toBe(true);
    }
  });

  it("rejects a route with zero DESTINATION nodes", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        route: [
          { id: "home-a", name: "Home A", node_type: "HOME", role: "HOME", priority: 1, mandatory: true },
          { id: "home-b", name: "Home B", node_type: "HOME", role: "HOME", priority: 2, mandatory: true },
        ],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("DESTINATION"))).toBe(true);
    }
  });

  it("rejects two HOME nodes", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        route: [
          { id: "home-a", name: "Home A", node_type: "HOME", role: "HOME", priority: 1, mandatory: true },
          { id: "home-b", name: "Home B", node_type: "HOME", role: "HOME", priority: 2, mandatory: true },
        ],
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects negative durations", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        legs: [
          {
            from: "dest",
            to: "home",
            mode: "DRIVE",
            duration: estimate({ range: { optimistic: -10, expected: -5, conservative: 0 } }),
          },
        ],
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects an estimate missing status", () => {
    const { status: _omit, ...noStatus } = estimate() as { status: string } & Record<string, unknown>;
    const result = TripSeedSchema.safeParse(
      seed({
        legs: [{ from: "dest", to: "home", mode: "DRIVE", duration: noStatus }],
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects an estimate missing confidence", () => {
    const { confidence: _omit, ...noConf } = estimate() as { confidence: string } & Record<string, unknown>;
    const result = TripSeedSchema.safeParse(
      seed({
        legs: [{ from: "dest", to: "home", mode: "DRIVE", duration: noConf }],
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects UNKNOWN presented as a precise verified value (value present)", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        legs: [
          {
            from: "dest",
            to: "home",
            mode: "DRIVE",
            duration: estimate({ status: "UNKNOWN", value: 45 }),
          },
        ],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("must not carry a precise value"))
      ).toBe(true);
    }
  });

  it("rejects UNKNOWN without a documented conservative assumption", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        legs: [
          {
            from: "dest",
            to: "home",
            mode: "DRIVE",
            duration: estimate({ status: "UNKNOWN", confidence: "UNKNOWN" }),
          },
        ],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("conservative assumption"))
      ).toBe(true);
    }
  });

  it("rejects a range violating optimistic <= expected <= conservative", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        legs: [
          {
            from: "dest",
            to: "home",
            mode: "DRIVE",
            duration: estimate({ range: { optimistic: 90, expected: 45, conservative: 60 } }),
          },
        ],
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects legs that do not chain the route in order", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        legs: [
          {
            from: "home",
            to: "dest",
            mode: "DRIVE",
            duration: estimate(),
          },
        ],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("must connect"))).toBe(true);
    }
  });

  it("rejects a hard_deadline without explicit +05:30 offset", () => {
    const result = TripSeedSchema.safeParse(seed({ hard_deadline: "2026-09-13T03:00:00Z" }));
    expect(result.success).toBe(false);
  });

  it("rejects a timezone other than Asia/Kolkata", () => {
    const result = TripSeedSchema.safeParse(seed({ timezone: "Asia/Dubai" }));
    expect(result.success).toBe(false);
  });

  it("rejects MANDATORY_DESTINATION with mandatory=false", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        route: baseSeed.route.map((n) => (n.id === "dest" ? { ...n, mandatory: false } : n)),
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects duplicate route node ids", () => {
    const result = TripSeedSchema.safeParse(
      seed({
        route: [
          { id: "dest", name: "A", node_type: "DESTINATION", role: "MANDATORY_DESTINATION", priority: 1, mandatory: true },
          { id: "dest", name: "A2", node_type: "DESTINATION", role: "MANDATORY_DESTINATION", priority: 2, mandatory: true },
          { id: "home", name: "Home", node_type: "HOME", role: "HOME", priority: 3, mandatory: true },
        ],
        legs: [
          { from: "dest", to: "dest", mode: "DRIVE", duration: estimate() },
          { from: "dest", to: "home", mode: "DRIVE", duration: estimate() },
        ],
      })
    );
    expect(result.success).toBe(false);
  });
});

describe("trip2026_09 seed (Slice 3 acceptance)", () => {
  it("validates clean at module load", () => {
    // trip2026_09 is already the parsed result — import success = validation success.
    expect(trip2026_09.seed_id).toBe("trip-2026-09-pilgrimage");
  });

  it("has 11 route nodes", () => {
    expect(trip2026_09.route).toHaveLength(11);
  });

  it("has 10 chained legs", () => {
    expect(trip2026_09.legs).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(trip2026_09.legs[i]!.from).toBe(trip2026_09.route[i]!.id);
      expect(trip2026_09.legs[i]!.to).toBe(trip2026_09.route[i + 1]!.id);
    }
  });

  it("has 9 MANDATORY_DESTINATION nodes (the pilgrimage)", () => {
    expect(
      trip2026_09.route.filter((n) => n.role === "MANDATORY_DESTINATION")
    ).toHaveLength(9);
  });

  it("has Vijayawada as RETURN_WAYPOINT, Narsapuram as HOME", () => {
    const vij = trip2026_09.route.find((n) => n.id === "vijayawada");
    expect(vij?.role).toBe("RETURN_WAYPOINT");
    const home = trip2026_09.route.find((n) => n.id === "narsapuram");
    expect(home?.role).toBe("HOME");
    expect(home?.node_type).toBe("HOME");
  });

  it("route begins at Tirupati and ends at HOME (origin leg is context, not a leg)", () => {
    expect(trip2026_09.route[0]!.id).toBe("tirupati");
    expect(trip2026_09.route[10]!.id).toBe("narsapuram");
    // The first leg starts at Tirupati — no narsapuram->tirupati leg exists.
    expect(trip2026_09.legs[0]!.from).toBe("tirupati");
  });

  it("hard deadline is 2026-09-13T03:00:00+05:30 with Asia/Kolkata timezone", () => {
    expect(trip2026_09.hard_deadline).toBe("2026-09-13T03:00:00+05:30");
    expect(trip2026_09.timezone).toBe("Asia/Kolkata");
  });

  it("every UNKNOWN estimate documents a conservative assumption and carries no precise value", () => {
    const estimates: Array<{ status: string; value?: number; assumption?: string }> = [
      ...trip2026_09.route.flatMap((n) => (n.visit ? [n.visit] : [])),
      ...trip2026_09.legs.map((l) => l.duration),
    ];
    for (const e of estimates) {
      if (e.status === "UNKNOWN") {
        expect(typeof e.assumption).toBe("string");
        expect(e.assumption!.length).toBeGreaterThan(0);
        expect(e.value).toBeUndefined();
      }
    }
    // Sanity: the seed actually contains UNKNOWN estimates.
    expect(estimates.some((e) => e.status === "UNKNOWN")).toBe(true);
  });

  it("every estimate satisfies optimistic <= expected <= conservative", () => {
    const estimates = [
      ...trip2026_09.route.flatMap((n) => (n.visit ? [n.visit] : [])),
      ...trip2026_09.legs.map((l) => l.duration),
    ];
    for (const e of estimates) {
      expect(e.range.optimistic).toBeLessThanOrEqual(e.range.expected);
      expect(e.range.expected).toBeLessThanOrEqual(e.range.conservative);
    }
  });
});
