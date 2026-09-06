/**
 * TRIP OS — state projection (plan Slice 4, roadmap §4.2 Correction #2).
 * The append-only event log is authoritative; this module derives the
 * current trip state deterministically from it. rebuildProjection is a
 * pure fold: replaying the same events in (actual_event_time, seq) order
 * always yields the same projection, and history is never mutated.
 */

import type { TripEvent } from "@trip-os/seed-data";

export type NodeStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "SKIPPED";

export interface NodeProjection {
  status: NodeStatus;
  checklist: Record<string, boolean>;
}

export interface DriveSegment {
  /** Epoch ms — DEPARTED time. */
  start: number;
  /** Epoch ms — next ARRIVED time, or trip_now if the segment is open. */
  end: number;
}

export interface FatigueCounters {
  /** Driving since the last completed rest (or trip start), minutes. */
  continuous_drive_min: number;
  /** Driving in the trailing 24h before trip_now, minutes. */
  drive_24h_min: number;
  rest_count: number;
}

export interface TripProjection {
  nodes: Record<string, NodeProjection>;
  current_node: string | null;
  current_activity: string | null;
  trip_started: boolean;
  delay_total_min: number;
  completed_activities: string[];
  drive_segments: DriveSegment[];
  /** Epoch ms of the last completed rest (resets continuous driving). */
  last_rest_at: number | null;
  rest_count: number;
  fatigue_counters: FatigueCounters;
  /** Trip-now: latest event time or verified network time (epoch ms). */
  trip_now: number | null;
  /** Device-vs-network skew in minutes from the latest TIME_UPDATED. */
  clock_skew_min: number | null;
  /** Audit: ids of events flagged by EVENT_CORRECTED. */
  corrections: string[];
  events_applied: number;
  last_event_id: string | null;
}

const MS_PER_MINUTE = 60_000;

export function initialProjection(nodeIds: string[] = []): TripProjection {
  const nodes: Record<string, NodeProjection> = {};
  for (const id of nodeIds) {
    nodes[id] = { status: "PENDING", checklist: {} };
  }
  return {
    nodes,
    current_node: null,
    current_activity: null,
    trip_started: false,
    delay_total_min: 0,
    completed_activities: [],
    drive_segments: [],
    last_rest_at: null,
    rest_count: 0,
    fatigue_counters: { continuous_drive_min: 0, drive_24h_min: 0, rest_count: 0 },
    trip_now: null,
    clock_skew_min: null,
    corrections: [],
    events_applied: 0,
    last_event_id: null,
  };
}

/**
 * Deterministic event order: (actual_event_time, seq, event_id).
 * Sorting makes the projection independent of the log's append order,
 * which is what makes rebuild-after-reload byte-stable.
 */
export function eventSortKey(e: TripEvent): [number, number, string] {
  return [Date.parse(e.actual_event_time), e.seq ?? 0, e.event_id];
}

function epoch(iso: string): number {
  return Date.parse(iso);
}

/** Compute fatigue counters from drive segments relative to trip_now. */
function computeFatigue(
  segments: DriveSegment[],
  tripNow: number | null,
  lastRestAt: number | null,
  restCount: number
): FatigueCounters {
  if (tripNow === null) {
    return { continuous_drive_min: 0, drive_24h_min: 0, rest_count: restCount };
  }
  const closed = segments.map((s) => ({
    ...s,
    end: Number.isFinite(s.end) ? s.end : tripNow!,
  }));
  const window24h = tripNow - 24 * 60 * MS_PER_MINUTE;
  let drive24 = 0;
  for (const s of closed) {
    const from = Math.max(s.start, window24h);
    if (s.end > from) drive24 += s.end - from;
  }
  // Continuous = driving after the last completed rest (REST_COMPLETED
  // closes the open segment and stamps last_rest_at, so anything that
  // started before it belongs to a finished driving stint).
  let continuous = 0;
  for (const s of closed) {
    const from = lastRestAt === null ? s.start : Math.max(s.start, lastRestAt);
    if (s.end > from) continuous += s.end - from;
  }
  return {
    continuous_drive_min: Math.round(continuous / MS_PER_MINUTE),
    drive_24h_min: Math.round(drive24 / MS_PER_MINUTE),
    rest_count: restCount,
  };
}

/**
 * Apply one event to a projection. Pure: returns a new projection,
 * never mutates the input. Unknown node ids are materialized on first
 * touch (the seed remains the source of node identity for the UI).
 */
export function applyEvent(prev: TripProjection, event: TripEvent): TripProjection {
  const p: TripProjection = {
    ...prev,
    nodes: { ...prev.nodes },
    completed_activities: [...prev.completed_activities],
    drive_segments: [...prev.drive_segments],
    corrections: [...prev.corrections],
    events_applied: prev.events_applied + 1,
    last_event_id: event.event_id,
  };
  const at = epoch(event.actual_event_time);
  const node = (id: string): NodeProjection => {
    if (!p.nodes[id]) p.nodes[id] = { status: "PENDING", checklist: {} };
    else p.nodes[id] = { ...p.nodes[id], checklist: { ...p.nodes[id].checklist } };
    return p.nodes[id]!;
  };
  const tripNow = (t: number) => {
    p.trip_now = p.trip_now === null ? t : Math.max(p.trip_now, t);
  };

  tripNow(at);

  switch (event.type) {
    case "TRIP_STARTED":
      p.trip_started = true;
      break;
    case "ARRIVED": {
      node(event.node_id).status = "ACTIVE";
      p.current_node = event.node_id;
      p.current_activity = null;
      // Close any open drive segment (DEPARTED without a later ARRIVED).
      p.drive_segments = p.drive_segments.map((s) =>
        s.end === Number.POSITIVE_INFINITY ? { ...s, end: at } : s
      );
      break;
    }
    case "DEPARTED": {
      const n = node(event.node_id);
      if (n.status === "ACTIVE") n.status = "PENDING";
      p.drive_segments = p.drive_segments.map((s) =>
        s.end === Number.POSITIVE_INFINITY ? { ...s, end: at } : s
      );
      p.drive_segments.push({ start: at, end: Number.POSITIVE_INFINITY });
      break;
    }
    case "ACTIVITY_COMPLETED": {
      const key = event.node_id ? `${event.activity}@${event.node_id}` : event.activity;
      if (!p.completed_activities.includes(key)) p.completed_activities.push(key);
      p.current_activity = null;
      break;
    }
    case "CHECKLIST_TOGGLED": {
      const n = node(event.node_id ?? "_trip");
      n.checklist[event.item_id] = event.done;
      break;
    }
    case "DESTINATION_COMPLETED": {
      node(event.node_id).status = "COMPLETED";
      if (p.current_node === event.node_id) p.current_activity = null;
      break;
    }
    case "DESTINATION_SKIPPED": {
      node(event.node_id).status = "SKIPPED";
      if (p.current_node === event.node_id) p.current_activity = null;
      break;
    }
    case "DELAY_ADDED":
      p.delay_total_min += event.amount_minutes;
      break;
    case "TIME_UPDATED": {
      const network = epoch(event.network_now);
      const device = epoch(event.device_now);
      p.clock_skew_min = Math.round((device - network) / MS_PER_MINUTE);
      tripNow(network);
      break;
    }
    case "LOCATION_UPDATED":
      if (event.node_id) p.current_node = event.node_id;
      break;
    case "ESTIMATE_VERIFIED":
      // Audit trail for estimate upgrades; the roadmap reads these to
      // replace an estimate's value at projection time. Recorded here so
      // the log stays the single source of what the family confirmed.
      break;
    case "EVENT_CORRECTED":
      p.corrections.push(event.corrected_event_id);
      break;
    case "REST_STARTED":
      p.current_activity = "REST";
      // Driving ends when the rest begins, not when it completes —
      // close the open segment at the rest start.
      p.drive_segments = p.drive_segments.map((s) =>
        s.end === Number.POSITIVE_INFINITY ? { ...s, end: at } : s
      );
      break;
    case "REST_COMPLETED": {
      p.current_activity = null;
      p.last_rest_at = at;
      p.rest_count = p.rest_count + 1;
      // A completed rest resets the continuous-drive counter by closing
      // the open segment and starting a fresh one after the rest.
      p.drive_segments = p.drive_segments.map((s) =>
        s.end === Number.POSITIVE_INFINITY ? { ...s, end: at } : s
      );
      p.drive_segments.push({ start: at, end: Number.POSITIVE_INFINITY });
      break;
    }
    case "STOP_ADDED":
      node(event.node_id);
      break;
    case "STOP_REMOVED":
      delete p.nodes[event.node_id];
      if (p.current_node === event.node_id) p.current_node = null;
      break;
    case "ROADMAP_RECOMPUTED":
      // Audit-only; recomputation is deterministic from state.
      break;
  }

  p.fatigue_counters = computeFatigue(
    p.drive_segments,
    p.trip_now,
    p.last_rest_at,
    p.rest_count
  );
  return p;
}

/**
 * Rebuild the projection from an event log. Sort order is canonical, so
 * rebuild(rebuild(x)) === rebuild(x) and shuffled logs project identically
 * (plan Slice 4 property tests).
 */
export function rebuildProjection(
  events: TripEvent[],
  nodeIds: string[] = []
): TripProjection {
  let p = initialProjection(nodeIds);
  const sorted = [...events].sort((a, b) => {
    const ka = eventSortKey(a);
    const kb = eventSortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || (ka[2] < kb[2] ? -1 : ka[2] > kb[2] ? 1 : 0);
  });
  for (const e of sorted) p = applyEvent(p, e);
  return p;
}

/**
 * Close open drive segments at a reference time (for what-if simulation
 * and roadmap rendering). Pure — does not mutate the input.
 */
export function closeOpenSegments(p: TripProjection, atEpochMs: number): TripProjection {
  return {
    ...p,
    drive_segments: p.drive_segments.map((s) =>
      s.end === Number.POSITIVE_INFINITY ? { ...s, end: atEpochMs } : s
    ),
  };
}
