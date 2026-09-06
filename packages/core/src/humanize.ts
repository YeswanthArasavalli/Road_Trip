/**
 * TRIP OS — user-facing strings (plan Slice 5). Every string is advisory
 * language; the banned-words test in constraints.test.ts enforces that
 * "guaranteed", "medically", and "certified" never appear here.
 */

import { toIstParts } from "./temporal";

export function fmtIst(epochMs: number): string {
  const p = toIstParts(epochMs);
  return `${p.date} ${p.time} IST`;
}

export function fmtClock(epochMs: number): string {
  return `${toIstParts(epochMs).time} IST`;
}

export function fmtMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 0) return `-${fmtMinutes(-m)}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

export function fmtRangeMinutes(r: { optimistic: number; expected: number; conservative: number }): string {
  return `${fmtMinutes(r.expected)} expected · ${fmtMinutes(r.conservative)} conservative`;
}

/** Advisory risk wording — states the buffer, never a promise. */
export function riskWording(risk: string, bufferMin: number): string {
  switch (risk) {
    case "SAFE":
      return `Comfortable margin so far: about ${fmtMinutes(bufferMin)} of slack under conservative estimates.`;
    case "TIGHT":
      return `Plan is tightening: about ${fmtMinutes(bufferMin)} of conservative slack. Avoid optional stops.`;
    case "AT_RISK":
      return `Deadline is at risk: only about ${fmtMinutes(bufferMin)} of conservative slack. Shorten stops and depart on time.`;
    case "CRITICAL":
      return `Deadline margin is critical: about ${fmtMinutes(bufferMin)}. Consider skipping non-essential visits.`;
    case "IMPOSSIBLE":
      return `Conservative estimates no longer reach home before the deadline (${fmtMinutes(bufferMin)} over). The plan needs changes.`;
    default:
      return "Risk unknown.";
  }
}
