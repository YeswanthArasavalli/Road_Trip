/**
 * TRIP OS — seed trip for the September 2026 pilgrimage (plan Slice 3).
 * Route model per roadmap §2.4 (Correction #1): 11 nodes, 10 legs,
 * Narsapuram modeled as a single terminal HOME node. The outbound drive
 * Narsapuram → Tirupati precedes route node 1 and is documented in
 * data-pass-2026-09.md, not modeled as a route leg.
 *
 * Data honesty (§6.1): drive durations are ESTIMATED (planner judgment,
 * not map-verified — see data pass). Queue/darshan durations are UNKNOWN
 * with explicit conservative assumptions. No invented verified sources.
 */

import { TripSeedSchema, type TripSeed } from "./schema";

const raw: TripSeed = {
  seed_id: "trip-2026-09-pilgrimage",
  timezone: "Asia/Kolkata",
  hard_deadline: "2026-09-13T03:00:00+05:30",
  normal_return_target: "2026-09-12",
  daily_routine_blocks: ["BATH", "WASHROOM", "GET_READY", "FOOD"],
  route: [
    {
      id: "tirupati",
      name: "Tirupati (Sri Venkateswara Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 1,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 120, expected: 240, conservative: 360 },
        assumption:
          "Sarva darshan queue unknown; conservative = up to 6h queue + prasadam/photos. Verify before departure.",
      },
    },
    {
      id: "srikalahasti",
      name: "Srikalahasti (Srikalahasteeswara Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 2,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 60, expected: 120, conservative: 180 },
        assumption: "Queue unknown; conservative = 3h. Verify before departure.",
      },
    },
    {
      id: "kanipakam",
      name: "Kanipakam (Vinayaka Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 3,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 45, expected: 90, conservative: 150 },
        assumption: "Queue unknown; conservative = 2.5h. Verify before departure.",
      },
    },
    {
      id: "tiruttani",
      name: "Tiruttani (Subramanya Swamy Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 4,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 45, expected: 90, conservative: 150 },
        assumption: "Queue unknown; conservative = 2.5h. Hill temple: road access up, no climbing on foot (§2.5).",
      },
    },
    {
      id: "kanchipuram",
      name: "Kanchipuram (Kamakshi Amman Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 5,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 45, expected: 90, conservative: 150 },
        assumption: "Queue unknown; conservative = 2.5h. Verify before departure.",
      },
    },
    {
      id: "tiruvannamalai",
      name: "Tiruvannamalai (Arunachaleswarar Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 6,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 60, expected: 120, conservative: 180 },
        assumption: "Queue unknown; conservative = 3h. No Girivalam (§2.5).",
      },
    },
    {
      id: "srirangam",
      name: "Srirangam (Ranganathaswamy Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 7,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 60, expected: 120, conservative: 180 },
        assumption: "Queue unknown; conservative = 3h. Verify before departure.",
      },
    },
    {
      id: "madurai",
      name: "Madurai (Meenakshi Amman Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 8,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 60, expected: 120, conservative: 180 },
        assumption: "Queue unknown; conservative = 3h. Verify before departure.",
      },
    },
    {
      id: "rameswaram",
      name: "Rameswaram (Ramanathaswamy Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 9,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 90, expected: 180, conservative: 300 },
        assumption:
          "Queue unknown; conservative = 5h (theertham bath + darshan). Deadline-critical node — latest safe departure home computed from here.",
      },
    },
    {
      id: "vijayawada",
      name: "Vijayawada",
      node_type: "DESTINATION",
      role: "RETURN_WAYPOINT",
      priority: 10,
      mandatory: false,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 0, expected: 60, conservative: 120 },
        assumption: "Short visit optional; degrades to drive-through under pressure (§2.4) — conservative = 2h if visited.",
      },
    },
    {
      id: "narsapuram",
      name: "Narsapuram (HOME)",
      node_type: "HOME",
      role: "HOME",
      priority: 11,
      mandatory: true,
    },
  ],
  legs: [
    {
      from: "tirupati",
      to: "srikalahasti",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 45, expected: 60, conservative: 70 },
        assumption: "~40 km; not map-verified (§6.2: conservative ≈ expected +15%).",
      },
    },
    {
      from: "srikalahasti",
      to: "kanipakam",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "LOW",
        range: { optimistic: 120, expected: 150, conservative: 170 },
        assumption: "~110 km two-lane; not map-verified.",
      },
    },
    {
      from: "kanipakam",
      to: "tiruttani",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 45, expected: 60, conservative: 70 },
        assumption: "~40 km; not map-verified.",
      },
    },
    {
      from: "tiruttani",
      to: "kanchipuram",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 45, expected: 60, conservative: 70 },
        assumption: "~45 km; not map-verified.",
      },
    },
    {
      from: "kanchipuram",
      to: "tiruvannamalai",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "LOW",
        range: { optimistic: 105, expected: 120, conservative: 140 },
        assumption: "~105 km state highway; not map-verified.",
      },
    },
    {
      from: "tiruvannamalai",
      to: "srirangam",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "LOW",
        range: { optimistic: 210, expected: 240, conservative: 270 },
        assumption: "~200 km; not map-verified.",
      },
    },
    {
      from: "srirangam",
      to: "madurai",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 135, expected: 150, conservative: 170 },
        assumption: "~130 km national highway; not map-verified.",
      },
    },
    {
      from: "madurai",
      to: "rameswaram",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "LOW",
        range: { optimistic: 165, expected: 180, conservative: 210 },
        assumption: "~170 km, Pamban bridge approach; not map-verified.",
      },
    },
    {
      from: "rameswaram",
      to: "vijayawada",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "LOW",
        range: { optimistic: 600, expected: 660, conservative: 750 },
        assumption:
          "~640 km, deadline-critical return leg; single driver, fatigue breaks included (§9). Not map-verified.",
      },
    },
    {
      from: "vijayawada",
      to: "narsapuram",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 150, expected: 170, conservative: 190 },
        assumption: "~130 km; not map-verified.",
      },
    },
  ],
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

/** Validated at module load — an invalid seed fails fast, never silently. */
export const trip2026_09: TripSeed = TripSeedSchema.parse(raw);
