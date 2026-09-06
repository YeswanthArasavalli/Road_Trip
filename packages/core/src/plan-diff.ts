/**
 * TRIP OS — plan diff (plan Slice 5, roadmap §28 "why did the plan
 * change?"). Deterministic comparison of two roadmap results; the
 * trigger is the event that caused the recomputation. Causes come from
 * data only — nothing is invented.
 */

import type { RoadmapResult } from "./roadmap";
import { fmtClock, fmtMinutes } from "./humanize";

export interface PlanChange {
  field: string;
  from: string;
  to: string;
}

export interface PlanDiff {
  trigger: string;
  changes: PlanChange[];
  reason: string;
}

export function diffPlans(previous: RoadmapResult | null, next: RoadmapResult, trigger: string): PlanDiff {
  const changes: PlanChange[] = [];

  if (previous) {
    const prevEta = fmtClock(previous.home_eta_range.conservative);
    const nextEta = fmtClock(next.home_eta_range.conservative);
    if (prevEta !== nextEta) {
      changes.push({ field: "Conservative home ETA", from: prevEta, to: nextEta });
    }
    if (previous.risk !== next.risk) {
      changes.push({ field: "Risk", from: previous.risk, to: next.risk });
    }
    const prevBuffer = Math.round(previous.buffer_minutes);
    const nextBuffer = Math.round(next.buffer_minutes);
    if (Math.abs(prevBuffer - nextBuffer) >= 1) {
      changes.push({
        field: "Conservative slack",
        from: fmtMinutes(prevBuffer),
        to: fmtMinutes(nextBuffer),
      });
    }
    if (previous.next_node_id !== next.next_node_id) {
      changes.push({
        field: "Next stop",
        from: previous.next_node_id ?? "—",
        to: next.next_node_id ?? "—",
      });
    }
    const prevDone = previous.progress.completed;
    const nextDone = next.progress.completed;
    if (prevDone !== nextDone) {
      changes.push({ field: "Completed destinations", from: String(prevDone), to: String(nextDone) });
    }
    if (!previous.stop_plan.some((s) => s.degrade_recommended) && next.stop_plan.some((s) => s.degrade_recommended)) {
      changes.push({
        field: "Vijayawada",
        from: "temple visit",
        to: "drive-through suggested (deadline pressure)",
      });
    }
  }

  const reason =
    changes.length === 0
      ? `Recomputed after ${trigger}; nothing material changed.`
      : `After ${trigger}: ` +
        changes
          .map((c) => {
            if (c.field === "Conservative slack") return `${c.field} moved from ${c.from} to ${c.to}`;
            if (c.field === "Risk") return `risk changed ${c.from} → ${c.to}`;
            if (c.field === "Conservative home ETA") return `home ETA moved ${c.from} → ${c.to}`;
            return `${c.field}: ${c.from} → ${c.to}`;
          })
          .join("; ") +
        ".";

  return { trigger, changes, reason };
}
