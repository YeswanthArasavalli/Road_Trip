# Data Pass — 2026-09 (verification pass 2026-09-06)

Source-of-record for every estimate in `trip-2026-09.ts`. This file replaces
`data-pass-2026-09-05.md` (provisional planner-judgment pass), which is no
longer the active source-of-record.

Rules applied (roadmap §6.1/§6.2): no invented verified data; a figure is
VERIFIED only when directly supported by an appropriate authoritative source;
routing/travel-site figures are ESTIMATED, not VERIFIED; unverifiable queues
are UNKNOWN with a conservative bound and a documented assumption.

## Verification method and honesty statement

A bounded web-verification pass was executed 2026-09-06 after the prior
research loop stalled on intermittent search-gateway failures. Nine searches
succeeded; three attempts to verify Tirumala/Tirupati all timed out and were
abandoned per the bounded-pass rule. Consequences:

- Statuses below record exactly what was obtained. Nothing was upgraded to
  VERIFIED on the strength of an "average" queue claim or an aggregator
  quote alone.
- Distance figures come from routing/travel sites (gozocabs, rome2rio,
  Wanderlog, Yatra, MakeMyTrip, ClearCarRental, distancesfrom) — adequate to
  justify ESTIMATED with a source, not VERIFIED (no map API was consulted).
- Temple hours marked "official HR&CE" come from hrce.tn.gov.in temple pages
  or the temple's own official site as surfaced in search results.

## Trip-level facts (unchanged from 2026-09-05 pass)

- Hard deadline: `2026-09-13T03:00:00+05:30` (user-fixed; IST, no DST).
- Timezone: `Asia/Kolkata` (fixed +05:30 offset).
- Normal return target: `2026-09-12` — deadline is the ceiling, not the plan.
- Routine block order (§2.5): BATH → WASHROOM → GET_READY → FOOD.
- Family operating mode: darshan only; no pujas/sevas/special rituals; no
  Girivalam; no hill climbing on foot; minimum walking; short photographs;
  elderly-friendly; temple prasadam preferred.
- Risk thresholds (shared with `packages/core` deadline defaults):
  SAFE ≥ 180 min buffer · TIGHT ≥ 90 · AT_RISK ≥ 30 · below → CRITICAL/IMPOSSIBLE.
- Fatigue defaults (§9, advisory): 180 continuous drive · 600 per 24h ·
  20 break · 180 night-drive warning (minutes).

## Origin context — not a route leg (§2.4 Correction #1)

The modeled route remains Srikalahasti → … → Vijayawada → Narsapuram (order
user-corrected 2026-09-06: Srikalahasti is visited FIRST, en route, then
Tirupati), with Narsapuram the single terminal HOME node. The outbound drive
Narsapuram → Srikalahasti precedes route node 1 and is NOT a modeled route
leg. Documented here per §4 of the verification gate:

- **Narsapuram → Srikalahasti (outbound origin context)** — ESTIMATED, LOW
  confidence. Derived from two sourced figures: Rome2Rio gives
  Tirupati ↔ Narasapuram 493 km and Srikalahasti ↔ Tirupati is ~36–40 km
  (leg 1), so via the Nellore–Nayudupeta–Srikalahasti approach the outbound
  drive is roughly **~455–465 km**, pure driving **~7h–7.5h**. With §9
  fatigue breaks for a single driver, realistic elapsed time is ~9–10h;
  plan the departure-day schedule accordingly. The exact route was not
  independently verified. Source: derivation from web-search figures
  (rome2rio.com 2026-09-06 + leg 1). retrieved_at: 2026-09-06. Not modeled
  as a leg; not deadline-relevant before the trip starts.

## Temple records (nine mandatory destinations, in corrected visit order)

Visit order user-corrected 2026-09-06: SRIKALAHASTI FIRST (en route from
Narsapuram), then Tirupati. Queues/darshan durations are NOT verifiable
before departure: every visit status is UNKNOWN, confidence UNKNOWN, no
precise value; the conservative bound is the planning assumption. Operating
hours are recorded separately with their own source where verification
succeeded. Fields not listed (parking, walking requirement, stairs, vehicle
access, specific restrictions) were not verified this pass → UNKNOWN; the
family-mode defaults (minimum walking, elderly-friendly, no climbing on
foot) are planning assumptions pending on-the-ground verification.

1. **Srikalahasti (Srikalahasteeswara)** — visit UNKNOWN (60/120/180).
   FIRST visit of the trip (user-corrected order 2026-09-06), en route
   Narsapuram → Tirupati. Hours 6:00–21:00 (ESTIMATED hours;
   srikalahasthitemple.com, yatra.com — not official). Free darshan
   available. Rahu-Ketu pooja explicitly excluded (darshan-only mode).
   retrieved_at 2026-09-06.
2. **Tirupati (Sri Venkateswara, Tirumala)** — visit UNKNOWN (120/240/360).
   Hours/queue NOT VERIFIED 2026-09-06: three search attempts timed out.
   Assumption unchanged: free Sarva darshan via queue complex; conservative
   6h queue + prasadam/photos; longest queue of the trip. Verify before
   departure. (Confidence: UNKNOWN.)
3. **Kanipakam (Vinayaka)** — visit UNKNOWN (45/90/150). Open ~4:00–21:30
   with darshan windows incl. 12:00–16:30; free Sarva Darshanam (ESTIMATED
   hours; gotirupati.com; official devasthanam site
   srikanipakadevasthanam.org surfaced but not directly fetched).
   retrieved_at 2026-09-06.
4. **Tiruttani (Subramanya Swamy)** — visit UNKNOWN (45/90/150). Hours
   6:00–13:00 & ~16:00–20:30; free Sarva Darshan (VERIFIED hours via HR&CE
   listing + official tiruttanitemple.com). Hill temple with motorable road
   access — no climbing on foot (§2.5). Stairs/access details otherwise
   UNKNOWN. retrieved_at 2026-09-06.
5. **Kanchipuram (Kamakshi Amman)** — visit UNKNOWN (45/90/150). Hours
   ~6:00–12:30 & 16:00–20:30; closed ~12:30–16:00 — schedule the visit
   around the afternoon closure (ESTIMATED hours; gotirupati.com,
   MakeMyTrip, kamakoti.org — not official). retrieved_at 2026-09-06.
6. **Tiruvannamalai (Arunachaleswarar)** — visit UNKNOWN (60/120/180).
   Hours VERIFIED via official HR&CE (annamalaiyar.hrce.tn.gov.in): darshan
   5:30–20:30, earlier ~19:30 cutoff on Sat/Sun/Pournami/holidays. No
   Girivalam (§2.5); avoid arriving on Pournami (extreme crowds).
   retrieved_at 2026-09-06.
7. **Srirangam (Ranganathaswamy)** — visit UNKNOWN (60/120/180). Hours
   VERIFIED via official HR&CE (srirangamranganathar.hrce.tn.gov.in):
   6:00–21:00 with sanctum closures 7:15–9:00, 12:30–14:15, 17:30–19:00 —
   plan the darshan attempt around them. retrieved_at 2026-09-06.
8. **Madurai (Meenakshi Amman)** — visit UNKNOWN (60/120/180). Hours
   VERIFIED via official HR&CE (maduraimeenakshi.hrce.tn.gov.in):
   5:00–12:30 & 16:00–22:00; free entry. retrieved_at 2026-09-06.
9. **Rameswaram (Ramanathaswamy)** — visit UNKNOWN (75/150/270). Hours
   VERIFIED via official HR&CE (rameswaramramanathar.hrce.tn.gov.in):
   opens 4:00, darshan 5:00–13:00, closed 13:00–15:00, evening to ~21:00.
   **Correction 2026-09-06:** the prior "theertham bath + darshan"
   assumption conflicted with the darshan-only family mode; the 22-theertham
   bathing (ticketed ritual) is EXCLUDED from the visit estimate. The visit
   covers darshan + the long corridor walk + prasadam/photos only. Normal
   personal BATH/WASHROOM/GET_READY remains a separate daily routine, not
   temple time. Deadline-critical node: latest-safe-departure home is
   computed from here. retrieved_at 2026-09-06.

Non-modeled stop — **Vijayawada (RETURN_WAYPOINT, Kanaka Durga Temple)**:
0/60/120. User-corrected 2026-09-06: the family intends to cover the
Kanaka Durga temple here on the return from Rameswaram; it degrades to
drive-through ONLY under hard deadline pressure (§2.4). Hours/queue
UNKNOWN (not verified this pass).

All visit queues: verification updates land as ESTIMATE_VERIFIED events, not
seed edits mid-trip.

## Drive legs (ten modeled legs) — minutes

| # | Leg | o/e/c (min) | Status | Source |
|---|-----|-------------|--------|--------|
| 1 | Srikalahasti → Tirupati | 45/60/70 | ESTIMATED (MEDIUM) | planner judgment, ~36–40 km, not map-verified |
| 2 | Tirupati → Kanipakam | 105/125/145 | ESTIMATED (MEDIUM) | ~78 km via Puttalapattu/Chittoor (aggregated distance source 2026-09-06); not map-verified |
| 3 | Kanipakam → Tiruttani | **75/95/115** | ESTIMATED (MEDIUM) | **sourced 2026-09-06: 73–88 km** (see below) |
| 4 | Tiruttani → Kanchipuram | 45/60/70 | ESTIMATED (MEDIUM) | planner judgment, ~45 km, not map-verified |
| 5 | Kanchipuram → Tiruvannamalai | 105/120/140 | ESTIMATED (LOW) | planner judgment, ~105 km state highway, not map-verified |
| 6 | Tiruvannamalai → Srirangam | 210/240/270 | ESTIMATED (LOW) | planner judgment, ~200 km, not map-verified |
| 7 | Srirangam → Madurai | 135/150/170 | ESTIMATED (MEDIUM) | planner judgment, ~130 km national highway, not map-verified |
| 8 | Madurai → Rameswaram | 165/180/210 | ESTIMATED (LOW) | planner judgment, ~170 km + Pamban bridge approach, not map-verified |
| 9 | Rameswaram → Vijayawada | **840/990/1200** | ESTIMATED (LOW) | **sourced 2026-09-06: ~996–1,038 km** (see below) |
| 10 | Vijayawada → Narsapuram | 150/170/190 | ESTIMATED (MEDIUM) | planner judgment, ~130 km, not map-verified |

No leg is VERIFIED (§6.1: no map API was consulted; travel-site quotes do
not make a duration an authoritative fact). §6.2 rule unchanged:
conservative ≈ expected +15% where planner-judged.

### Corrected leg 3 — Kanipakam → Tiruttani

Prior seed: ~40 km, 45/60/70 min — geometrically impossible (below the
straight-line floor established by the earlier sanity check). Sourced
correction (web search 2026-09-06): **73–88 km** road distance,
**~1h–2h30** by car — gozocabs.com 88 km/2h30; rome2rio.com 73 km/~1h12;
distancesfrom.com 78 km/~1h30. New seed range 75/95/115 min (conservative ≈
expected +15%); confidence MEDIUM; status ESTIMATED; retrieved_at
2026-09-06. State-highway segment; the 2h30 cab quote is treated as
traffic-heavy, not as the expected case.

### Corrected leg 9 — Rameswaram → Vijayawada (CRITICAL)

Prior seed: ~640 km, 600/660/750 min — geometrically impossible
(straight-line floor ≈ 814 km). Sourced correction (web search
2026-09-06): **~996–1,038 km** road distance; **13h02 (Wanderlog, normal
traffic) to 17h46 (Yatra)** pure driving; MakeMyTrip quotes ~1,000+ km with
a much larger elapsed allowance. An earlier research note suggesting
830–870 km / 15–17h could not be independently confirmed; it is treated as
an optimistic floor only and does NOT govern the conservative bound.

New seed range **840/990/1200 min** (14h / 16.5h / 20h), status ESTIMATED,
confidence LOW, retrieved_at 2026-09-06. The range reflects actual road
travel uncertainty for a single driver; it does NOT imply a guaranteed
arrival.

**Impact (critical):** at ~990 min expected driving plus Rameswaram darshan
and a fatigue-compliant schedule (§9 caps: 180 min continuous, 600 min per
24h), this leg alone exceeds the safe single-day driving budget. An
overnight rest halt is probable, which pushes home arrival to the night of
2026-09-12 → morning of 2026-09-13 and consumes nearly the entire margin to
the `2026-09-13T03:00:00+05:30` hard deadline. The 2026-09-12 normal return
target is at risk; the deadline-risk math must treat this leg as the
governing constraint, and the fatigue engine must treat it as requiring
rest stops (advisory output only, §25 safety language).

## Remaining uncertainty

- Tirumala hours/queue: UNVERIFIED (gateway failures) — highest-value
  verification target before departure.
- Every darshan queue duration: UNKNOWN (all nine temples).
- Legs 1, 4–8, 10: planner-judgment ESTIMATES, no source yet.
- Parking, walking distances from parking, stairs, elderly access details,
  vehicle/restriction specifics at all temples: UNKNOWN.
- Rameswaram → Vijayawada exact best route and its true elapsed time with
  a single elderly-accompanied driver: UNKNOWN beyond the sourced range.

## Upgrade path

Any figure here may be replaced by a VERIFIED entry with `source` +
`retrieved_at` once an appropriate authoritative source is checked (temple
notice, map API). Until then, the conservative bounds above govern all
feasibility math.
