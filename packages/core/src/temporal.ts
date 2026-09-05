/**
 * TRIP OS — temporal engine (roadmap §4.3, plan Slice 2).
 * Pure functions over epoch milliseconds with an explicit fixed IST offset.
 * No Date.now() anywhere — `now` is always injected by callers.
 */

export const IST_OFFSET_MINUTES = 330; // Asia/Kolkata, UTC+05:30, no DST

const MS_PER_MINUTE = 60_000;

export interface IstParts {
  date: string; // "YYYY-MM-DD" in IST
  time: string; // "HH:mm" in IST
  epochMs: number;
}

/**
 * Convert epoch ms to IST wall-clock parts.
 * (Fixed offset — arithmetic on epoch + 330 minutes, then ISO decomposition.)
 */
export function toIstParts(epochMs: number): IstParts {
  const shifted = new Date(epochMs + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  const iso = shifted.toISOString(); // "YYYY-MM-DDTHH:mm:ss.sssZ" (now = IST wall time)
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
    epochMs,
  };
}

/**
 * Convert an IST wall time to epoch ms.
 */
export function istToEpochMs(date: string, time: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y!, mo! - 1, d!, h!, mi!, 0, 0);
  return asUtc - IST_OFFSET_MINUTES * MS_PER_MINUTE;
}

export function addMinutes(epochMs: number, minutes: number): number {
  return epochMs + minutes * MS_PER_MINUTE;
}

export function minutesBetween(a: number, b: number): number {
  return Math.round((b - a) / MS_PER_MINUTE);
}

/**
 * Compare device clock against a verified network time.
 * Skew is surfaced, never silently corrected (roadmap §14).
 */
export function detectClockSkew(
  deviceNow: number,
  networkNow: number,
  thresholdMin: number = 2
): { skewed: boolean; skewMin: number } {
  const skewMin = Math.round((deviceNow - networkNow) / MS_PER_MINUTE);
  return { skewed: Math.abs(skewMin) > thresholdMin, skewMin };
}
