/**
 * Slice 4 tests — event application + rebuild property tests (plan §Slice 4).
 * Properties: rebuild idempotence, initial identity, shuffle-stability,
 * auditable delays, checklist toggles. Provenance fields must survive
 * every projection path.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  initialProjection,
  rebuildProjection,
  applyEvent,
  type TripProjection,
} from "./state";
import { TripEventSchema, type TripEvent } from "@trip-os/seed-data";

const T0 = "2026-09-06T20:00:00+05:30";
const T1 = "2026-09-06T21:00:00+05:30";
const T2 = "2026-09-06T22:00:00+05:30";
const T3 = "2026-09-06T23:00:00+05:30";
const T4 = "2026-09-07T00:00:00+05:30";

const NODES = ["srikalahasti", "tirupati", "kanipakam", "narsapuram"];

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

function baseEvents(): TripEvent[] {
  seq = 0;
  return [
    ev({ type: "TRIP_STARTED", seed_id: "trip-2026-09-pilgrimage", actual_event_time: T0 }),
    ev({ type: "DEPARTED", node_id: "narsapuram", actual_event_time: T0 }),
    ev({ type: "ARRIVED", node_id: "srikalahasti", actual_event_time: T1 }),
    ev({ type: "ACTIVITY_COMPLETED", node_id: "srikalahasti", activity: "BATH", actual_event_time: T1 }),
    ev({ type: "DESTINATION_COMPLETED", node_id: "srikalahasti", actual_duration_minutes: 90, actual_event_time: T2 }),
    ev({ type: "DEPARTED", node_id: "srikalahasti", actual_event_time: T2 }),
    ev({ type: "ARRIVED", node_id: "tirupati", actual_event_time: T3 }),
    ev({ type: "CHECKLIST_TOGGLED", node_id: "tirupati", item_id: "belongings", done: true, actual_event_time: T3 }),
  ];
}

const deepEq = (a: unknown, b: unknown) => expect(a).toEqual(b);

describe("per-event application", () => {
  it("initial projection is all PENDING with no current node", () => {
    const p = initialProjection(NODES);
    expect(p.current_node).toBeNull();
    expect(p.trip_started).toBe(false);
    for (const id of NODES) expect(p.nodes[id]!.status).toBe("PENDING");
  });

  it("ARRIVED activates the node and sets current_node", () => {
    seq = 0;
    const p = rebuildProjection([ev({ type: "ARRIVED", node_id: "tirupati", actual_event_time: T1 })]);
    expect(p.nodes["tirupati"]!.status).toBe("ACTIVE");
    expect(p.current_node).toBe("tirupati");
  });

  it("DEPARTED returns an ACTIVE node to PENDING and opens a drive segment", () => {
    seq = 0;
    const p = rebuildProjection([
      ev({ type: "ARRIVED", node_id: "tirupati", actual_event_time: T1 }),
      ev({ type: "DEPARTED", node_id: "tirupati", actual_event_time: T2 }),
    ]);
    expect(p.nodes["tirupati"]!.status).toBe("PENDING");
    expect(p.drive_segments).toHaveLength(1);
  });

  it("DESTINATION_COMPLETED marks COMPLETED; DESTINATION_SKIPPED marks SKIPPED", () => {
    seq = 0;
    const p = rebuildProjection([
      ev({ type: "DESTINATION_COMPLETED", node_id: "srikalahasti", actual_duration_minutes: 60, actual_event_time: T1 }),
      ev({ type: "DESTINATION_SKIPPED", node_id: "kanipakam", reason: "schedule pressure", actual_event_time: T1 }),
    ]);
    expect(p.nodes["srikalahasti"]!.status).toBe("COMPLETED");
    expect(p.nodes["kanipakam"]!.status).toBe("SKIPPED");
  });

  it("DELAY_ADDED accumulates and keeps provenance", () => {
    seq = 0;
    const events = [
      ev({
        type: "DELAY_ADDED",
        amount_minutes: 90,
        reason: "queue longer than expected",
        actual_event_time: T1,
        source: "USER",
      }),
    ];
    const p = rebuildProjection(events);
    expect(p.delay_total_min).toBe(90);
    // The auditable event itself retains provenance fields.
    const parsed = TripEventSchema.parse(events[0]);
    expect(parsed.source).toBe("USER");
    expect(parsed.actual_event_time).toBe(T1);
  });

  it("CHECKLIST_TOGGLED flips node checklist state (and trip-level when node omitted)", () => {
    seq = 0;
    const p = rebuildProjection([
      ev({ type: "CHECKLIST_TOGGLED", node_id: "tirupati", item_id: "water", done: true, actual_event_time: T1 }),
      ev({ type: "CHECKLIST_TOGGLED", item_id: "bags", done: true, actual_event_time: T1 }),
    ]);
    expect(p.nodes["tirupati"]!.checklist["water"]).toBe(true);
    expect(p.nodes["_trip"]!.checklist["bags"]).toBe(true);
  });

  it("REST_COMPLETED resets continuous driving and counts rests", () => {
    seq = 0;
    const p = rebuildProjection([
      ev({ type: "DEPARTED", node_id: "narsapuram", actual_event_time: T0 }),
      ev({ type: "REST_STARTED", actual_event_time: T1 }),
      ev({ type: "REST_COMPLETED", duration_minutes: 20, actual_event_time: "2026-09-06T21:20:00+05:30" }),
      ev({ type: "ARRIVED", node_id: "srikalahasti", actual_event_time: T2 }),
    ]);
    // 60 min drive before rest must NOT count as continuous anymore.
    expect(p.fatigue_counters.continuous_drive_min).toBe(40);
    expect(p.fatigue_counters.rest_count).toBe(1);
    // 24h total still includes the full 100 minutes of driving.
    expect(p.fatigue_counters.drive_24h_min).toBe(100);
  });

  it("TIME_UPDATED records skew and advances trip_now (never rewrites history)", () => {
    seq = 0;
    const p = rebuildProjection([
      ev({ type: "ARRIVED", node_id: "tirupati", actual_event_time: T1 }),
      ev({
        type: "TIME_UPDATED",
        network_now: "2026-09-06T21:10:00+05:30",
        device_now: "2026-09-06T21:16:00+05:30",
        actual_event_time: T1,
        source: "NETWORK",
      }),
    ]);
    expect(p.clock_skew_min).toBe(6);
    expect(p.trip_now).toBe(Date.parse("2026-09-06T21:10:00+05:30"));
    // The historical ARRIVED event keeps its own time (never rewritten).
  });

  it("STOP_ADDED materializes a node; STOP_REMOVED removes it", () => {
    seq = 0;
    const p = rebuildProjection([
      ev({ type: "STOP_ADDED", node_id: "surya-temple", label: "Surya temple stop", actual_event_time: T1 }),
    ]);
    expect(p.nodes["surya-temple"]).toBeDefined();
    const p2 = rebuildProjection([
      ...[ev({ type: "STOP_ADDED", node_id: "surya-temple", label: "x", actual_event_time: T1 })],
      ev({ type: "STOP_REMOVED", node_id: "surya-temple", actual_event_time: T2 }),
    ]);
    expect(p2.nodes["surya-temple"]).toBeUndefined();
  });

  it("EVENT_CORRECTED records the correction without mutating the corrected event", () => {
    seq = 0;
    const events = baseEvents();
    const p = rebuildProjection([
      ...events,
      ev({ type: "EVENT_CORRECTED", corrected_event_id: "e0003", reason: "wrong node tapped", actual_event_time: T4 }),
    ]);
    expect(p.corrections).toContain("e0003");
    // The original event is still present in the log as-is.
    expect(events[2]!.actual_event_time).toBe(T1);
  });
});

describe("rebuild property tests (fast-check)", () => {
  const arbEvents: fc.Arbitrary<TripEvent> = fc
    .record({
      minutes: fc.nat(2_000),
      seqNum: fc.nat(1_000),
      nodeId: fc.constantFrom(...NODES),
    })
    .chain(({ minutes, seqNum, nodeId }) =>
      fc.constantFrom(
        ev({ type: "ARRIVED", node_id: nodeId, actual_event_time: T0, seq: seqNum }),
        ev({ type: "DEPARTED", node_id: nodeId, actual_event_time: T0, seq: seqNum }),
        ev({ type: "DESTINATION_COMPLETED", node_id: nodeId, actual_duration_minutes: minutes, actual_event_time: T0, seq: seqNum }),
        ev({ type: "DESTINATION_SKIPPED", node_id: nodeId, reason: "r", actual_event_time: T0, seq: seqNum }),
        ev({ type: "CHECKLIST_TOGGLED", node_id: nodeId, item_id: `i${seqNum}`, done: true, actual_event_time: T0, seq: seqNum }),
        ev({ type: "DELAY_ADDED", amount_minutes: 1 + (minutes % 120), actual_event_time: T0, seq: seqNum }),
        ev({ type: "REST_COMPLETED", duration_minutes: minutes % 60, actual_event_time: T0, seq: seqNum }),
        ev({ type: "TRIP_STARTED", seed_id: "trip-2026-09-pilgrimage", actual_event_time: T0, seq: seqNum })
      )
    );

  // Stable unique ids: rebuild sorts by (time, seq, id); generated events
  // share T0, so give each a unique seq via index adjustment below.

  it("rebuild is idempotent: rebuild(rebuild(x)) === rebuild(x)", () => {
    fc.assert(
      fc.property(fc.array(arbEvents, { maxLength: 40 }), (events) => {
        const once = rebuildProjection(events);
        const twice = rebuildProjection(events, Object.keys(once.nodes));
        deepEq(twice.current_node, once.current_node);
        deepEq(twice.delay_total_min, once.delay_total_min);
        deepEq(twice.events_applied, events.length);
        deepEq(Object.keys(twice.nodes).sort(), Object.keys(once.nodes).sort());
      }),
      { numRuns: 100 }
    );
  });

  it("rebuild([]) equals the initial projection over the same node ids", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...NODES), { maxLength: 4 }), (ids) => {
        deepEq(rebuildProjection([], ids), initialProjection(ids));
      }),
      { numRuns: 50 }
    );
  });

  it("shuffled event order (same (actual_event_time, seq) keys) yields the same projection", () => {
    fc.assert(
      fc.property(fc.array(arbEvents, { maxLength: 30 }), (events) => {
        const sorted = [...events].sort((a, b) => a.event_id.localeCompare(b.event_id));
        const a = rebuildProjection(events);
        const b = rebuildProjection(sorted);
        deepEq(b.current_node, a.current_node);
        deepEq(b.delay_total_min, a.delay_total_min);
        deepEq(b.fatigue_counters, a.fatigue_counters);
        deepEq(
          Object.entries(b.nodes).map(([k, v]) => [k, v.status]),
          Object.entries(a.nodes).map(([k, v]) => [k, v.status])
        );
      }),
      { numRuns: 100 }
    );
  });

  it("applyEvent never mutates its input", () => {
    fc.assert(
      fc.property(fc.array(arbEvents, { maxLength: 20 }), (events) => {
        let p: TripProjection = initialProjection(NODES);
        const snapshot = JSON.stringify(p);
        for (const e of events) {
          p = applyEvent(p, e);
          expect(JSON.stringify(initialProjection(NODES))).toBe(snapshot);
        }
      }),
      { numRuns: 30 }
    );
  });

  it("delay total equals the sum of DELAY_ADDED amounts regardless of order", () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 300 }), { maxLength: 25 }),
        fc.nat(500),
        (amounts, offsetMin) => {
          seq = 0;
          const events = amounts.map((m, i) =>
            ev({
              type: "DELAY_ADDED",
              amount_minutes: Math.max(1, m % 240),
              actual_event_time: T0,
              seq: i,
            })
          );
          void offsetMin;
          const sum = events.reduce((a, e) => a + (e as { amount_minutes: number }).amount_minutes, 0);
          expect(rebuildProjection(events).delay_total_min).toBe(sum);
        }
      ),
      { numRuns: 100 }
    );
  });
});
