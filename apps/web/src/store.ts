/**
 * TRIP OS — live trip store (plan Slices 4–7).
 * The append-only event log is the single source of truth, persisted to
 * localStorage so the trip survives reload/offline/browser restart
 * (roadmap §10/§29). All derivations (projection, roadmap, fatigue) are
 * computed from the log on demand — never stored as truth.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  TripEventSchema,
  trip2026_09,
  type TripEvent,
} from "@trip-os/seed-data";
import {
  computeRoadmap,
  rebuildProjection,
  evaluateFatigue,
  diffPlans,
  type RoadmapResult,
  type PlanDiff,
} from "@trip-os/core";

const SEED = trip2026_09;
const SEED_IDS = SEED.route.map((n) => n.id);

const ROADMAP_CONFIG = {
  deadline: Date.parse(SEED.hard_deadline),
  thresholds: {
    safeMaxMinutes: SEED.risk_thresholds.safe_max_minutes,
    tightMaxMinutes: SEED.risk_thresholds.tight_max_minutes,
    atRiskMaxMinutes: SEED.risk_thresholds.at_risk_max_minutes,
  },
  fatigue: {
    max_continuous_drive_minutes: SEED.fatigue.max_continuous_drive_minutes,
    max_drive_minutes_in_24h: SEED.fatigue.max_drive_minutes_in_24h,
    recommended_break_minutes: SEED.fatigue.recommended_break_minutes,
    night_drive_warning_threshold_minutes: SEED.fatigue.night_drive_warning_threshold_minutes,
  },
};

export { SEED, ROADMAP_CONFIG };

interface TripStore {
  events: TripEvent[];
  /** Last plan diff (why the plan changed) — display-only, derived. */
  lastReason: string | null;
  append: (partial: Record<string, unknown> & { type: string }) => void;
  /** Recompute the live roadmap against an injected clock. */
  roadmap: (now: number) => RoadmapResult;
  reasonForLastChange: (now: number, trigger: string) => PlanDiff;
  resetTrip: () => void;
}

let eventCounter = 0;

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      events: [],
      lastReason: null,

      append: (partial) => {
        const nowIso = new Date().toISOString();
        eventCounter += 1;
        const parsed = TripEventSchema.parse({
          ...partial,
          actual_event_time: partial.actual_event_time ?? nowIso,
          recorded_at: nowIso,
          source: partial.source ?? "USER",
          event_id: `${Date.now().toString(36)}-${eventCounter}`,
        });
        const before = get().roadmap(Date.now());
        set({ events: [...get().events, parsed as TripEvent] });
        const after = get().roadmap(Date.now());
        const trigger =
          parsed.type === "DELAY_ADDED" && typeof parsed.amount_minutes === "number"
            ? `a ${parsed.amount_minutes}-minute delay`
            : `${parsed.type}`;
        const diff = diffPlans(before, after, trigger);
        set({ lastReason: diff.changes.length ? diff.reason : null });
      },

      roadmap: (now) => {
        const projection = rebuildProjection(get().events, SEED_IDS);
        return computeRoadmap(projection, SEED, ROADMAP_CONFIG, now);
      },

      reasonForLastChange: (now, trigger) => {
        const projection = rebuildProjection(get().events, SEED_IDS);
        const current = computeRoadmap(projection, SEED, ROADMAP_CONFIG, now);
        const priorEvents = get().events.slice(0, -1);
        const prior = computeRoadmap(rebuildProjection(priorEvents, SEED_IDS), SEED, ROADMAP_CONFIG, now);
        return diffPlans(prior, current, trigger);
      },

      resetTrip: () => set({ events: [], lastReason: null }),
    }),
    {
      name: "trip-os-events-v1",
      // Persist only the log — everything else is derived (rebuildable).
      partialize: (s) => ({ events: s.events }) as unknown as TripStore,
    }
  )
);

/** Derived helpers for components (selector-style, cheap for this scale). */
export function projectionOf(events: TripEvent[]) {
  return rebuildProjection(events, SEED_IDS);
}

export function fatigueOf(events: TripEvent[]) {
  return evaluateFatigue(rebuildProjection(events, SEED_IDS), ROADMAP_CONFIG.fatigue);
}
