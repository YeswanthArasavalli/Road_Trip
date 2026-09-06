# TRIP OS — Phase 0.1 Changelog

Baseline: `TRIP_OS_MASTER_ROADMAP.md` v1 (Sept 4, 2026). 12 corrections applied. No implementation performed.

## Amendments

- **#1 — 11 route nodes with role semantics.** Previous: "10 destinations"; Narsapuram as an ordinary destination. New: `node_type: DESTINATION | HOME` plus `role: MANDATORY_DESTINATION | OPTIONAL_DESTINATION | RETURN_WAYPOINT | HOME`. Reason: HOME is never sightseeing; Vijayawada can degrade (drive-through / short visit / skip) without "failing" a pilgrimage stop. Where: roadmap §2.4, seed schema, Slice 3.
- **#2 — Event log is the authoritative local history.** Previous: "Dexie as truth" wording. New: `trip_events` is append-only and authoritative; projections, ETA, risk, and checklist state are derived and rebuildable via `rebuildProjection(events)`. Reason: rebuildability must be binding. Where: roadmap §4.2, plan global constraints, Slice 4 rebuild property tests.
- **#3 — Confidence and provenance on all material estimates.** Previous: single-point estimates. New: `Estimate<T>` with `status: VERIFIED | ESTIMATED | UNKNOWN`, 4-level confidence, source, retrieved_at. Reason: an UNKNOWN field must never silently become a precise number. Where: roadmap §6.1, Slice 2 `estimates.ts`, scenario P.
- **#4 — Home ETA is a range; conservative governs safety.** Previous: single home ETA. New: `{optimistic, expected, conservative}`; risk classification uses only the conservative buffer. Reason: optimistic ETA must never make an unsafe plan look safe. Where: roadmap §6.3, Slice 2/5 tests, scenario O.
- **#5 — Live traffic can never create false safety.** Previous: live route data could implicitly become truth. New: live data updates expected/optimistic; the conservative bound never drops below expected + configurable margin. Reason: a live API is not a guaranteed arrival. Where: roadmap §6.4, scenario O structural test.
- **#6 — Driver fatigue reclassified P1 → P0.** Previous: P1. New: P0 safety requirement; the engine must recommend REST NOW over any attraction; parameters configurable (max_continuous_drive_minutes default 180, etc.); all outputs labeled advisory, explicitly not medical. Where: roadmap §9, Slice 6, scenario L must-pass.
- **#7 — First-class "WE ARE DELAYED" action.** Previous: delays via implicit timestamp edits. New: prominent Home button → +15m/+30m/+1h/+2h/Custom → `DELAY_ADDED {amount_minutes, source: USER}` auditable event, then deterministic recalculation. Where: roadmap §15, Slice 5 UI, scenario Q.
- **#8 — Three-clock time model with event provenance.** Previous: implicit device clock. New: DEVICE NOW / TRIP NOW / VERIFIED NETWORK TIME; every event carries `{actual_event_time, recorded_at, source: USER | GPS | NETWORK | SYSTEM}`; user-stated times are never silently overwritten; skew above a threshold shows a warning, historical events are never auto-rewritten. Where: roadmap §14, Slice 4 provenance tests, scenario N.
- **#9 — Fatigue model made configurable.** Previous: fixed warnings. New: configurable parameters (`max_continuous_drive_minutes`, `recommended_break_minutes`, `max_drive_minutes_in_24h`, `night_drive_warning_threshold`), documented as application policy, not legal or medical standards. Where: roadmap §9, Slice 6 boundary tests (180/181).
- **#10 — Estimation honesty mechanisms throughout.** Previous: point estimates everywhere. New: ranges + confidence labels + conservative-governs rule; scenario suite extended A–N → A–R (O: no false-safe from live/optimistic data; P: unknown ≠ precise; Q: delay audited; R: rebuild after corruption). Where: roadmap §6–7, §30, requirement matrix R4/R12/R13.
- **#11 — Vertical slices with release gates G1–G4.** Previous: v1 phase table without explicit gates. New: 8 slices, each ending runnable; gates G1 (property tests) → G2 (scenarios A–F, K, N, O, P, Q) → G3 (scenario L; trip-ready core) → G4 (real-device offline gate; release-ready). Reason: 2-day runway demands runnable-at-every-boundary. Where: implementation plan, roadmap §29.
- **#12 — MVP-A scope lock (MUST / SHOULD / DEFERRED).** Previous: undifferentiated MVP-A table. New: three-tier scope lock (roadmap §33); plan covers MUST items only; AI-Lite optional (Slice 8); Maps, Apify, AI-Full, sync, auth, Postgres explicitly deferred. Reason: anti-scope-creep.

## Other changes

- Real-device offline test strengthened from a checklist item to a **P0 release gate** (roadmap §24, plan Slice 7).
- Vijayawada modeled as RETURN_WAYPOINT with explicit degrade semantics under schedule pressure (roadmap §2.4, §11).
- Requirement matrix reclassified: R7/R9 (offline verification, fatigue) moved to P0; R13 (AI-Lite) P1 optional; Maps/Apify/sync P2; weather/localization P3 (roadmap §31).
- Trip-works-with-everything-off guarantee made a binding P0 acceptance checklist (roadmap §21).
- Safety-language rules made binding: advisory wording enforced by a banned-words string test in Slice 6 (roadmap §25).
- Future sync reduced to a documented design boundary — nothing built in MVP-A (roadmap §23).

## Notes

- The first generation of the implementation plan was corrupted and was fully rewritten clean; the version on disk is the clean rewrite.
- Scoring model and nearby-opportunity engine remain P2 (deferred), unchanged from v1.

## Slice 2 verified baseline (2026-09-05)

- HEAD at baseline: `e24903f` — tests 33/33 PASS, build PASS (PWA emitted).
- Temporal: fixed IST offset (330 min), midnight crossing + clock-skew property-tested; no `Date.now()` in core.
- Estimates: `Estimate<T>` with status/confidence/source/retrieved_at + 3-point ranges; accumulation identity-tested.
- Deadline: all six functions implemented; `classifyRisk(buffer, thresholds)` is structurally conservative-only — a single numeric risk input, no optimistic value can reach it (arity-tested).
- UNKNOWN-not-precise: documented at type level; hard enforcement lands in the Slice 3 Zod seed schema (plan §147).
- Accepted architectural decisions: `now` parameter unused inside `deadlineBuffer` (interface stability, provenance); web `tsc` excludes `*.test.ts(x)` (browser build must not depend on Node-only test modules; Vitest still runs them); Slices 1+2 share commit `e68a329` — kept, not rewritten.
- Known defects: NONE.
- Slice 3 began with no Slice 3+ code present.

## Slice 3 verified baseline (2026-09-05)

- Seed package: `schema.ts` (Zod), `trip-2026-09.ts`, `schema.test.ts` (23 tests), `data-pass-2026-09.md` (source-of-record; renamed from the provisional `data-pass-2026-09-05.md` in the 2026-09-06 verification pass); `index.ts` re-exports schema + trip + version.
- Seed validates at module load (`TripSeedSchema.parse`) — invalid seed fails fast, never silently.
- Route model per roadmap §2.4: 11 nodes / 10 chained legs, Tirupati → Narsapuram HOME; the Narsapuram → Tirupati outbound drive is trip-origin context documented in the data pass, not a route leg.
- 9 MANDATORY_DESTINATION nodes; Vijayawada RETURN_WAYPOINT (mandatory=false, degrades to drive-through); Narsapuram single terminal HOME node.
- Data honesty (§6.1): all visit/darshan queues UNKNOWN — conservative assumption documented, no precise value (schema-refined + tested); drive legs ESTIMATED with 3-point ranges and confidence (conservative ≈ expected +15%, §6.2); no invented VERIFIED sources; no Maps/Apify/AI consulted.
- Deadline `2026-09-13T03:00:00+05:30`, timezone `Asia/Kolkata` (regex-enforced offset); normal return target 2026-09-12; routine order BATH → WASHROOM → GET_READY → FOOD.
- Test invocation note: vitest must run from workspace root (`pnpm test -- packages/seed-data`); package-dir runs find no files (root config uses root-relative globs).
- Workspace tests at close: 56/56 PASS (8 files), seed-data targeted 23+1 green.
- Known defects: NONE. Slice 4 (TripEvent schemas) not started.

## Slice 3 data verification pass (2026-09-06)

- Bounded, evidence-first verification after the parallel research loop
  stalled on search-gateway failures. No architecture change; no Slice 4
  work.
- Source-of-record renamed: `data-pass-2026-09-05.md` →
  `data-pass-2026-09.md` (old file removed; plan §Slice 3 references updated).
- Two geometrically impossible legs corrected from sourced routing evidence
  (retrieved 2026-09-06): Kanipakam → Tiruttani 45/60/70 → 75/95/115 min
  (~73–88 km, gozocabs/rome2rio); Rameswaram → Vijayawada 600/660/750 →
  840/990/1200 min (~996–1,038 km, Wanderlog/Yatra/MakeMyTrip/ClearCarRental).
  The return leg is now the governing deadline constraint; arrival is NOT
  guaranteed and an overnight halt is probable (§9 fatigue caps).
- Rameswaram visit assumption corrected: theertham bathing excluded
  (darshan-only family mode); range 90/180/300 → 75/150/270; hours verified
  via official HR&CE site.
- Temple hours sourced 2026-09-06 for 8 of 9 destinations (5 via official
  HR&CE pages); Tirumala NOT verified (3 gateway timeouts) — remains
  UNKNOWN. All darshan queues remain UNKNOWN; nothing promoted to VERIFIED
  on an average-queue claim.
- Outbound origin context Narsapuram → Tirupati documented in the data pass:
  ~493–521 km, ~7–7.5h pure driving (Rome2Rio/MakeMyTrip) — not a route leg.
- Drive legs remain ESTIMATED (no map API consulted; travel-site quotes do
  not confer VERIFIED status).
- Route model unchanged: 11 nodes / 10 legs / single terminal Narsapuram
  HOME / Vijayawada RETURN_WAYPOINT; deadline, timezone, thresholds,
  fatigue and offline-first architecture all unchanged.

## Route order correction (2026-09-06, user-sourced)

- User corrected the actual visit order: **Srikalahasti FIRST** (en route
  from Narsapuram on the overnight outbound), **then Tirupati**. Seed
  updated: route nodes 1↔2 swapped, legs re-chained (Srikalahasti →
  Tirupati ~36–40 km; new Tirupati → Kanipakam leg ~78 km via
  Puttalapattu/Chittoor, 105/125/145 min, aggregated distance source).
- Outbound origin context re-scoped: Narsapuram → Srikalahasti (~455–465
  km derived from sourced figures), documented in the data pass, not a
  modeled leg.
- Vijayawada clarified: family intends to cover Kanaka Durga temple on the
  return from Rameswaram; remains RETURN_WAYPOINT, degrades to
  drive-through only under hard deadline pressure (§2.4). No architecture
  change.

## Slices 4–6 verified baseline (2026-09-06, pre-departure build)

- HEAD range: `f56c84c` (slice 4 core) → `cd00e11` (slices 5–6 core) →
  `3735248` (delay-horizon fix) → `2ad8461` (web UI live shell).
  Workspace tests at close: **96/96 PASS** (11 files); build PASS
  (tsc + Vite, PWA emitted, 7 precache entries).
- Slice 4 — `packages/core/src/state.ts`: `applyEvent` + `rebuildProjection`
  pure fold over the append-only event log; deterministic order via
  `eventSortKey (actual_event_time, seq, event_id)` (idempotence, shuffle
  stability, and never-mutate property tests); drive segments, fatigue
  counters, trip-now monotonicity, TIME_UPDATED skew, corrections audit.
- Slices 5–6 — `roadmap.ts` (computeRoadmap + planFrom + simulateDelay
  what-if + waypoint degrade), `deadline.ts` (all six functions,
  conservative-only risk), `plan-diff.ts` (before/after reason), fatigue
  rules (180 continuous / 600 per 24h / 20 break / 180 night, advisory-only,
  banned-words test). Scenario suite green incl. O (no false-safe),
  P (UNKNOWN stays unknown), Q (delay audited), L (REST NOW).
- **Delay-horizon design (amendment to #7):** `DELAY_ADDED` keeps
  `delay_total_min` (auditable raw sum) and sets
  `delay_horizon = max(prev_horizon, event_time) + amount`;
  `computeRoadmap` plans from `max(now, delay_horizon)`. Conservative only,
  absorbed naturally once the wall clock passes the horizon (no
  double-count), shuffle-stable. Milestone absorption deliberately NOT
  implemented — it is a no-op when the milestone ≥ horizon and
  anti-conservative (false-safe) when below.
- Web UI (slices 4–6 UI): zustand store appending TripEvents with
  localStorage persistence (`trip-os-events-v1`); Home / Route / Checklist
  screens; START TRIP, ARRIVED / VISIT COMPLETE / DEPART, WE ARE DELAYED
  (+15/30/60/120m), TAKE BREAK / BREAK DONE, routine activities; 30s clock
  tick; "What changed" card with humanized reasons. 6 live interaction
  tests incl. engine-consistency (store roadmap === direct computeRoadmap)
  and the delay-reason test.
- Slice 7 (offline hardening) is code-complete in the build
  (SW precache + navigateFallback + static no-fetch checks) but the
  **real-device airplane-mode gate (§24) has NOT been run** — see the final
  engineering report. Slice 8 (AI-Lite) intentionally not started.
- Known defects: NONE open in code. See report for deployment + device
  steps that remain user-side.

## Phone-deploy pass (2026-09-06, pre-departure)

- LAN HTTPS: `@vitejs/plugin-basic-ssl` added to web devDependencies and
  enabled in `vite.config.ts` **preview mode only** (`isPreview` guard;
  dev/localhost stays plain HTTP). Reason: a PWA service worker cannot
  register on a plain-HTTP LAN origin (not a secure context), which would
  silently block the phone install. Self-signed → phone shows a warning
  page once; proceeding is expected and safe on a home network.
- New root script `pnpm phone` = `vite preview --host --port 4173
  --strictPort` on the freshly built `dist/`. Verified this machine:
  HTTPS 200 on `/`, `/manifest.webmanifest`, `/sw.js`; listening on
  `0.0.0.0:4173`; Windows Firewall Node.js inbound allow-rule exists
  (Private profile); active Wi-Fi profile is Private. LAN IP at verification:
  `192.168.29.22`.
- Re-verified after the change: tests 96/96 PASS (11 files), `pnpm build`
  PASS (PWA emitted, 7 precache entries).

