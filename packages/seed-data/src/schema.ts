/**
 * TRIP OS — seed data Zod schemas (roadmap §5/§6, plan Slice 3).
 * Data honesty at the boundary: every material field carries status +
 * confidence; UNKNOWN never carries a precise value (§6.1). Validation
 * rejects structurally dishonest seeds before they can enter the app.
 */

import { z } from "zod";

export const EstimateStatusSchema = z.enum(["VERIFIED", "ESTIMATED", "UNKNOWN"]);
export const EstimateConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

/**
 * A duration estimate in minutes. UNKNOWN status must NOT carry a
 * precise point value — only a range whose conservative bound is the
 * documented assumption (source of the assumption in `assumption`).
 */
export const EstimateSchema = z
  .object({
    status: EstimateStatusSchema,
    confidence: EstimateConfidenceSchema,
    /** Precise point value — forbidden when status is UNKNOWN (§6.1). */
    value: z.number().nonnegative().optional(),
    range: z
      .object({
        optimistic: z.number().nonnegative(),
        expected: z.number().nonnegative(),
        conservative: z.number().nonnegative(),
      })
      .refine((r) => r.optimistic <= r.expected && r.expected <= r.conservative, {
        message: "range must satisfy optimistic <= expected <= conservative",
      }),
    /** Required for UNKNOWN: the documented conservative assumption. */
    assumption: z.string().optional(),
    /** Where this figure came from — never invented (§6.1). */
    source: z.string().optional(),
    retrieved_at: z.string().optional(), // ISO 8601
  })
  .refine((e) => e.status !== "UNKNOWN" || e.assumption !== undefined, {
    message: "UNKNOWN estimates must document their conservative assumption",
  })
  .refine((e) => e.status !== "UNKNOWN" || e.value === undefined, {
    message: "UNKNOWN estimates must not carry a precise value",
  });

export const NodeTypeSchema = z.enum(["DESTINATION", "HOME"]);
export const NodeRoleSchema = z.enum([
  "MANDATORY_DESTINATION",
  "OPTIONAL_DESTINATION",
  "RETURN_WAYPOINT",
  "HOME",
]);

export const RouteNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  node_type: NodeTypeSchema,
  role: NodeRoleSchema,
  priority: z.number().int().nonnegative(),
  mandatory: z.boolean(),
  /** Visit/darshan duration estimate at this node (minutes) — optional. */
  visit: EstimateSchema.optional(),
});

export const LegSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  mode: z.enum(["DRIVE"]),
  /** Drive duration estimate (minutes). */
  duration: EstimateSchema,
});

/** Deadline must be an ISO instant with an explicit +05:30 IST offset. */
const HardDeadlineSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+05:30$/, {
    message: "hard_deadline must be ISO 8601 with explicit +05:30 offset",
  })
  .refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "hard_deadline must parse as a real instant",
  });

export const TripSeedSchema = z
  .object({
    seed_id: z.string().min(1),
    timezone: z.literal("Asia/Kolkata"),
    hard_deadline: HardDeadlineSchema,
    /** Route nodes in travel order: HOME first, HOME last. */
    route: z.array(RouteNodeSchema).min(2),
    /** Exactly one leg per consecutive route pair, in order. */
    legs: z.array(LegSchema).min(1),
    /** Mandatory daily routine blocks in execution order (roadmap §2.5). */
    daily_routine_blocks: z
      .array(z.enum(["BATH", "WASHROOM", "GET_READY", "FOOD", "REST", "SLEEP"]))
      .min(1),
    /** "YYYY-MM-DD" — the normal return day; the deadline is the ceiling. */
    normal_return_target: z.string().optional(),
    risk_thresholds: z.object({
      safe_max_minutes: z.number().positive(),
      tight_max_minutes: z.number().positive(),
      at_risk_max_minutes: z.number().positive(),
    }),
    /** Roadmap §9 initial defaults. */
    fatigue: z.object({
      max_continuous_drive_minutes: z.number().positive(),
      max_drive_minutes_in_24h: z.number().positive(),
      recommended_break_minutes: z.number().nonnegative(),
      /** Continuous night driving between 22:00–06:00 before a warning. */
      night_drive_warning_threshold_minutes: z.number().positive(),
    }),
  })
  .superRefine((seed, ctx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    // Unique node ids.
    const ids = seed.route.map((n) => n.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) fail(["route"], `duplicate route node ids: ${dupes.join(", ")}`);

    // Exactly one HOME, at a route endpoint (roadmap §2.4: Narsapuram is
    // modeled as a single HOME node — origin/terminus are one node).
    const homeIdx = seed.route
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => n.role === "HOME");
    if (homeIdx.length !== 1) {
      fail(["route"], `exactly one HOME node required, found ${homeIdx.length}`);
    } else {
      const { i } = homeIdx[0]!;
      if (i !== 0 && i !== seed.route.length - 1) {
        fail(["route"], "HOME node must be first or last in route order");
      }
    }

    // Role/node_type consistency.
    for (const [i, n] of seed.route.entries()) {
      if (n.role === "HOME" && n.node_type !== "HOME") {
        fail(["route", i], "role HOME requires node_type HOME");
      }
      if (n.role !== "HOME" && n.node_type === "HOME") {
        fail(["route", i], "node_type HOME requires role HOME");
      }
      if (n.role === "MANDATORY_DESTINATION" && !n.mandatory) {
        fail(["route", i], "MANDATORY_DESTINATION must have mandatory=true");
      }
    }

    // At least one real destination — a route of pure waypoints is not a trip.
    const destinations = seed.route.filter((n) => n.node_type === "DESTINATION");
    if (destinations.length === 0) {
      fail(["route"], "route must contain at least one DESTINATION node");
    }

    // Counts of mandatory destinations / return waypoints are trip-level
    // properties, asserted in tests against this seed — not schema rules.

    // Route ordering: legs must chain consecutive route pairs.
    if (seed.legs.length !== seed.route.length - 1) {
      fail(["legs"], `route of ${seed.route.length} nodes requires ${seed.route.length - 1} legs, found ${seed.legs.length}`);
    } else {
      for (let i = 0; i < seed.legs.length; i++) {
        const leg = seed.legs[i]!;
        if (leg.from !== seed.route[i]!.id || leg.to !== seed.route[i + 1]!.id) {
          fail(["legs", i], `leg ${i} must connect ${seed.route[i]!.id} -> ${seed.route[i + 1]!.id}`);
        }
      }
    }
  });

export type SeedEstimate = z.infer<typeof EstimateSchema>;
export type SeedRouteNode = z.infer<typeof RouteNodeSchema>;
export type SeedLeg = z.infer<typeof LegSchema>;
export type TripSeed = z.infer<typeof TripSeedSchema>;

/**
 * TripEvent schemas (plan Slice 4). The local event log is authoritative:
 * append-only, immutable, every event carries provenance
 * { actual_event_time, recorded_at, source }. History is never silently
 * rewritten — corrections are new EVENT_CORRECTED events.
 */
export const EventSourceSchema = z.enum(["USER", "GPS", "NETWORK", "SYSTEM"]);

const EventProvenance = z.object({
  /** ISO 8601 instant — when the thing actually happened. */
  actual_event_time: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "actual_event_time must parse as a real instant",
  }),
  /** ISO 8601 instant — when the app recorded it. */
  recorded_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "recorded_at must parse as a real instant",
  }),
  source: EventSourceSchema,
  /** Append-order id — unique, monotonic per device log. */
  event_id: z.string().min(1),
  /** Optional device-assigned sequence for stable (time, seq) ordering. */
  seq: z.number().int().nonnegative().optional(),
});

const ActivitySchema = z.enum(["BATH", "WASHROOM", "GET_READY", "FOOD"]);

export const TripEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TRIP_STARTED"), seed_id: z.string().min(1) }).merge(EventProvenance),
  z.object({ type: z.literal("ARRIVED"), node_id: z.string().min(1) }).merge(EventProvenance),
  z.object({ type: z.literal("DEPARTED"), node_id: z.string().min(1) }).merge(EventProvenance),
  z
    .object({
      type: z.literal("ACTIVITY_COMPLETED"),
      node_id: z.string().min(1).optional(),
      activity: ActivitySchema,
      duration_minutes: z.number().nonnegative().optional(),
    })
    .merge(EventProvenance),
  z
    .object({
      type: z.literal("CHECKLIST_TOGGLED"),
      node_id: z.string().min(1).optional(), // omit = trip-level checklist
      item_id: z.string().min(1),
      done: z.boolean(),
    })
    .merge(EventProvenance),
  z
    .object({
      type: z.literal("DESTINATION_COMPLETED"),
      node_id: z.string().min(1),
      actual_duration_minutes: z.number().nonnegative(),
    })
    .merge(EventProvenance),
  z
    .object({
      type: z.literal("DESTINATION_SKIPPED"),
      node_id: z.string().min(1),
      reason: z.string().min(1),
    })
    .merge(EventProvenance),
  z
    .object({
      type: z.literal("DELAY_ADDED"),
      amount_minutes: z.number().positive(),
      reason: z.string().optional(),
    })
    .merge(EventProvenance),
  z
    .object({
      type: z.literal("TIME_UPDATED"),
      network_now: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "network_now must parse as a real instant",
      }),
      device_now: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "device_now must parse as a real instant",
      }),
    })
    .merge(EventProvenance),
  z
    .object({
      type: z.literal("LOCATION_UPDATED"),
      node_id: z.string().min(1).optional(),
      note: z.string().optional(),
    })
    .merge(EventProvenance),
  z
    .object({
      type: z.literal("ESTIMATE_VERIFIED"),
      ref: z.string().min(1), // node id or "from->to" leg ref
      field: z.string().min(1),
      value_minutes: z.number().nonnegative().optional(),
      value_text: z.string().optional(),
      estimate_source: z.string().min(1),
      retrieved_at: z.string().min(1),
    })
    .merge(EventProvenance),
  z
    .object({
      type: z.literal("EVENT_CORRECTED"),
      corrected_event_id: z.string().min(1),
      reason: z.string().min(1),
    })
    .merge(EventProvenance),
  z.object({ type: z.literal("REST_STARTED"), node_id: z.string().min(1).optional() }).merge(EventProvenance),
  z.object({ type: z.literal("REST_COMPLETED"), duration_minutes: z.number().nonnegative() }).merge(EventProvenance),
  z
    .object({
      type: z.literal("STOP_ADDED"),
      node_id: z.string().min(1),
      label: z.string().min(1),
    })
    .merge(EventProvenance),
  z.object({ type: z.literal("STOP_REMOVED"), node_id: z.string().min(1) }).merge(EventProvenance),
  z
    .object({
      type: z.literal("ROADMAP_RECOMPUTED"),
      reason: z.string().min(1),
    })
    .merge(EventProvenance),
]);

export type TripEvent = z.infer<typeof TripEventSchema>;
export type EventSource = z.infer<typeof EventSourceSchema>;
export type RoutineActivity = z.infer<typeof ActivitySchema>;
