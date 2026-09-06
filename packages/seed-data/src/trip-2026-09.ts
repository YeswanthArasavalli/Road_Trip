/**
 * TRIP OS — seed trip for the September 2026 pilgrimage (plan Slice 3).
 * Route model per roadmap §2.4 (Correction #1): 11 nodes, 10 legs,
 * Narsapuram modeled as a single terminal HOME node. The outbound drive
 * Narsapuram → Srikalahasti precedes route node 1 and is documented in
 * data-pass-2026-09.md, not modeled as a route leg.
 *
 * Route order (user-corrected 2026-09-06): SRIKALAHASTI is visited FIRST
 * (en route from Narsapuram), then Tirupati. Vijayawada (Kanaka Durga) is
 * the return-waypoint temple cover on the way home from Rameswaram.
 *
 * Data honesty (§6.1): drive durations are ESTIMATED — two geometrically
 * impossible legs (Kanipakam→Tiruttani, Rameswaram→Vijayawada) were
 * corrected from web-sourced routing evidence 2026-09-06; the rest remain
 * planner judgment, not map-verified (see data pass). Queue/darshan
 * durations are UNKNOWN with explicit conservative assumptions; temple
 * operating hours carry a source + retrieved_at where verification
 * succeeded 2026-09-06 (Tirumala verification failed — remains UNKNOWN).
 * No invented verified sources.
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
      id: "srikalahasti",
      name: "Srikalahasti (Srikalahasteeswara Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 1,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 60, expected: 120, conservative: 180 },
        assumption:
          "Queue unknown; conservative = 3h. Hours 6:00–21:00 per aggregator source (2026-09-06, not official). Rahu-Ketu pooja NOT in family mode (darshan only, §2.5). FIRST visit — en route from Narsapuram (user-corrected order).",
        source: "web search: srikalahasthitemple.com, yatra.com",
        retrieved_at: "2026-09-06",
      },
    },
    {
      id: "tirupati",
      name: "Tirupati (Sri Venkateswara Temple)",
      node_type: "DESTINATION",
      role: "MANDATORY_DESTINATION",
      priority: 2,
      mandatory: true,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 120, expected: 240, conservative: 360 },
        assumption:
          "Sarva darshan queue unknown; conservative = up to 6h queue + prasadam/photos. Hours/queue NOT verified 2026-09-06 (search gateway failed 3×) — verify before departure.",
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
        assumption:
          "Queue unknown; conservative = 2.5h. Free Sarva Darshanam; open ~4:00–21:30 with darshan windows incl. 12:00–16:30 (2026-09-06, aggregator + devasthanam site — not directly fetched).",
        source: "web search: gotirupati.com, srikanipakadevasthanam.org",
        retrieved_at: "2026-09-06",
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
        assumption:
          "Queue unknown; conservative = 2.5h. Hours 6:00–13:00 & ~16:00–20:30 (2026-09-06, HR&CE listing + official temple site); free Sarva Darshan. Hill temple: motorable road access, no climbing on foot (§2.5).",
        source: "web search: hrce.tn.gov.in (Tiruttani listing), tiruttanitemple.com",
        retrieved_at: "2026-09-06",
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
        assumption:
          "Queue unknown; conservative = 2.5h. Hours ~6:00–12:30 & 16:00–20:30; closed ~12:30–16:00 (2026-09-06, aggregator sources — not official).",
        source: "web search: gotirupati.com, MakeMyTrip, kamakoti.org",
        retrieved_at: "2026-09-06",
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
        assumption:
          "Queue unknown; conservative = 3h. Hours verified 2026-09-06 (official HR&CE): darshan 5:30–20:30, earlier ~19:30 cutoff Sat/Sun/Pournami/holidays. No Girivalam (§2.5); avoid Pournami arrival.",
        source: "web search: annamalaiyar.hrce.tn.gov.in (official HR&CE)",
        retrieved_at: "2026-09-06",
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
        assumption:
          "Queue unknown; conservative = 3h. Hours verified 2026-09-06 (official HR&CE): 6:00–21:00 with sanctum closures 7:15–9:00, 12:30–14:15, 17:30–19:00 — schedule around them.",
        source: "web search: srirangamranganathar.hrce.tn.gov.in (official HR&CE)",
        retrieved_at: "2026-09-06",
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
        assumption:
          "Queue unknown; conservative = 3h. Hours verified 2026-09-06 (official HR&CE): 5:00–12:30 & 16:00–22:00; free entry.",
        source: "web search: maduraimeenakshi.hrce.tn.gov.in (official HR&CE)",
        retrieved_at: "2026-09-06",
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
        range: { optimistic: 75, expected: 150, conservative: 270 },
        assumption:
          "DARSHAN ONLY — theertham bathing (22 theerthams, ticketed ritual) explicitly EXCLUDED per family operating mode (§2.5); prior 'theertham bath + darshan' assumption corrected 2026-09-06. Queue unknown; conservative 4.5h incl. long corridor walk + prasadam/photos. Hours verified 2026-09-06 (official HR&CE): opens 4:00, darshan 5:00–13:00, closed 13:00–15:00, evening to ~21:00. Deadline-critical node — latest safe departure home computed from here.",
        source: "web search: rameswaramramanathar.hrce.tn.gov.in (official HR&CE)",
        retrieved_at: "2026-09-06",
      },
    },
    {
      id: "vijayawada",
      name: "Vijayawada (Kanaka Durga Temple)",
      node_type: "DESTINATION",
      role: "RETURN_WAYPOINT",
      priority: 10,
      mandatory: false,
      visit: {
        status: "UNKNOWN",
        confidence: "UNKNOWN",
        range: { optimistic: 0, expected: 60, conservative: 120 },
        assumption:
          "Family intends to cover Kanaka Durga temple on the return from Rameswaram (user-corrected 2026-09-06); degrades to drive-through only under hard deadline pressure (§2.4) — conservative = 2h if visited. Hours/queue UNKNOWN.",
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
      from: "srikalahasti",
      to: "tirupati",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 45, expected: 60, conservative: 70 },
        assumption: "~36–40 km; not map-verified (§6.2: conservative ≈ expected +15%).",
      },
    },
    {
      from: "tirupati",
      to: "kanipakam",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 105, expected: 125, conservative: 145 },
        assumption:
          "~78 km via Puttalapattu/Chittoor road (aggregated distance source, 2026-09-06); not map-verified. Replaces the former Srikalahasti→Kanipakam leg after the user-corrected route order change.",
        source: "web search 2026-09-06: aggregated distance sources (~78 km Tirupati→Kanipakam via Puttalapattu)",
        retrieved_at: "2026-09-06",
      },
    },
    {
      from: "kanipakam",
      to: "tiruttani",
      mode: "DRIVE",
      duration: {
        status: "ESTIMATED",
        confidence: "MEDIUM",
        range: { optimistic: 75, expected: 95, conservative: 115 },
        assumption:
          "~73–88 km by state highway — corrected 2026-09-06; prior ~40 km figure was geometrically impossible (below the straight-line floor). Conservative ≈ expected +15% (§6.2).",
        source:
          "web search 2026-09-06: gozocabs.com (88 km / 2h30), rome2rio.com (73 km / ~1h12), distancesfrom.com (78 km / ~1h30)",
        retrieved_at: "2026-09-06",
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
        range: { optimistic: 840, expected: 990, conservative: 1200 },
        assumption:
          "~996–1,038 km by road — corrected 2026-09-06; prior ~640 km figure was geometrically impossible (straight-line floor ≈ 814 km). Pure driving 13–17.5h; conservative 20h includes fatigue breaks. Single driver + §9 caps (180 min continuous / 600 min per 24h) mean this leg likely cannot be completed in one safe same-day push — an overnight rest halt is probable and arrival is NOT guaranteed. Deadline-critical; an earlier 830–870 km figure could not be independently confirmed and is treated as an optimistic floor only.",
        source:
          "web search 2026-09-06: Wanderlog (996 km / 13h02 normal traffic), ClearCarRental (1,038 km), Yatra.com (17h46), MakeMyTrip (1,000+ km)",
        retrieved_at: "2026-09-06",
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
