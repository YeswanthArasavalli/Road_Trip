# TRIP OS — MVP-A Implementation Plan

**Companion to:** `TRIP_OS_MASTER_ROADMAP.md` (v2) · **Changelog:** `TRIP_OS_CHANGELOG_PHASE_0_1.md`
**Status: PLAN ONLY — implementation is not authorized until `APPROVED — START MVP-A IMPLEMENTATION`.**

## How to read this plan

- **Vertical slices**: every slice ends with a runnable app. No big-bang integration.
- Slice order is the **critical path**; dependencies are explicit. Slices 1–7 are sequential; Slice 3 research is parallelizable with Slice 2; Slice 8 is optional.
- **No completion-time promises.** Scope, dependencies, gates, and rollback points are defined; pace is reality-driven.
- Scope lock: only `MUST HAVE` items from roadmap §33. Anything not listed is deferred, not added.

## Global Constraints (binding on every slice)

- Hard deadline constant: `2026-09-13T03:00:00+05:30`, tz `Asia/Kolkata`.
- **Conservative ETA governs all feasibility/risk classification.** Optimistic never makes unsafe look safe.
- Every user action = append-only event with `{actual_event_time, recorded_at, source}`.
- Projections rebuildable from events at all times (rebuild test is P0).
- **No core trip calculation may require a fetch request.**
- Core must run with AI=OFF, MAPS=OFF, APIFY=OFF, INTERNET=OFF.
- Fatigue rules are P0, configurable, labeled **advisory**, never medical claims.
- All engine functions are pure; `now` is always injected (no `Date.now()` inside `packages/core`).
- TypeScript strict; Zod-validated seed data and events; Vitest + fast-check property tests; tests run via `pnpm test` at workspace root; commit at every slice boundary.
- Safety language: "estimated / projected / conservative / advisory" — never guarantees.

## Files map (whole MVP-A, at completion)

```text
apps/web/
  index.html
  vite.config.ts                 # vite-plugin-pwa; SW config finalized in Slice 7
  src/main.tsx
  src/App.tsx                    # screen router
  src/screens/Home.tsx           # incl. 🚨 WE ARE DELAYED, ETA range, latest-safe-departure
  src/screens/Roadmap.tsx        # per-leg ranges, risk, "why changed" drawer
  src/screens/Checklist.tsx
  src/components/TimePicker.tsx
  src/components/RiskBadge.tsx
  src/components/EtaRange.tsx
  src/components/DelayButton.tsx
  src/hooks/useTripStore.ts      # Zustand + Dexie persistence
  src/lib/engine-adapter.ts      # bridges pure engines ↔ UI (injects now, loads seed)
packages/core/                    # pure TS — zero runtime deps except zod
  src/temporal.ts                 # IST math, midnight crossing, clock-skew detection
  src/estimates.ts                # Estimate<T>, range accumulation
  src/deadline.ts                 # buffer, risk classification, latest-safe-departure
  src/roadmap.ts                  # computeRoadmap over ranges
  src/plan-diff.ts                # before/after diff + reason
  src/constraints.ts              # routine blocks, mobility, fatigue
  src/simulate.ts                 # what-if on cloned state
  src/humanize.ts                 # formatting for UI
  src/*.test.ts                   # colocated tests
packages/seed-data/
  schema.ts                       # Zod: RouteNode, TripSeed, TripEvent schemas
  src/trip-2026-09.ts             # the actual trip (11 nodes)
  src/data-pass-2026-09-05.md     # Sept 5 research outputs (source + confidence per field)
```

---

## Slice 1 — Foundation (app boots, offline shell)

**Files:**

- Create: pnpm workspace (`pnpm-workspace.yaml`, root `package.json`), `packages/core`, `packages/seed-data`, `apps/web`
- Create: `apps/web/index.html`, `vite.config.ts` (vite-plugin-pwa, generateSW), `src/main.tsx`, minimal `src/App.tsx`
- Test: one smoke test per package

**Interfaces produced:** workspace scripts `pnpm test` (all packages), `pnpm dev`, `pnpm build`; app shell boots with zero network.

**Dependencies:** none.

**Tests:** package-import smoke tests; app-shell render test.

**Acceptance criteria:**
- `pnpm dev` serves the shell; `pnpm build` + preview serve the built app.
- `pnpm test` green.
- Built app loads with network blocked (devtools offline) → shell renders, no blank screen.

**Manual verification:** open dev build on desktop and the LAN-served built preview on a phone; offline reload → shell renders.

**Commit:** `feat: workspace scaffold + offline shell (slice 1)` · **Rollback point:** start of repo.

---

## Slice 2 — Temporal & Deadline Engine (deadline demo works)

**Files:**

- Create: `packages/core/src/temporal.ts`, `estimates.ts`, `deadline.ts`
- Test: colocated `*.test.ts` for each

**Interfaces produced:**

```text
// temporal.ts
toIst(epochMs) -> { date: "YYYY-MM-DD", time: "HH:mm", epochMs }
istToEpochMs(dateStr, "HH:mm") -> epochMs          // fixed +05:30 offset, no DST
addMinutes(epochMs, n) -> epochMs
minutesBetween(a, b) -> number
detectClockSkew(deviceNow, networkNow, thresholdMin = 2) -> { skewed, skewMin }
// all functions take epochMs — no Date.now() anywhere in core

// estimates.ts
Estimate<T> { status: VERIFIED|ESTIMATED|UNKNOWN;
              confidence: HIGH|MEDIUM|LOW|UNKNOWN;
              value?: T;  range?: { optimistic, expected, conservative };
              source?, retrieved_at? }
accumulateRange(items: Range[]) -> Range           // sum per bound
addMinutesToRange(r, min) -> Range

// deadline.ts
deadlineBuffer(now, conservativeEta, deadline) -> minutes
classifyRisk(bufferMin, thresholds?) -> SAFE|TIGHT|AT_RISK|CRITICAL|IMPOSSIBLE
canAbsorbDelay(state, minutes) -> { feasible, resulting_risk }
projectHomeEta(legsAndStops) -> { optimistic, expected, conservative }
latestSafeDeparture(now, conservativeRemainingMinutes, deadline) -> epochMs
requiredDepartureTime(fromNode, deadline, conservativeRemainingMinutes) -> epochMs
```

**Dependencies:** Slice 1.

**Tests (TDD: failing test → run → implement → pass):**
- temporal: IST conversion; `addMinutes` across Sept 12 23:50 → Sept 13 00:10; 02:59 → 03:00 → 03:01.
- fast-check property tests: `addMinutes(x, 0) === x`; monotonicity; `minutesBetween(a, addMinutes(a, n)) === n`; midnight-crossing property near the deadline window.
- estimates: `accumulateRange` sums each bound independently; unknown-status fields carry ranges.
- deadline: buffer math; risk classification at exact boundaries (181/180/90/30/0/−1 min); `classifyRisk` is a pure function of the buffer argument only — **structurally cannot consult optimistic values**; `canAbsorbDelay`, `projectHomeEta`, `latestSafeDeparture` boundary tests.

**Acceptance criteria:** all temporal/estimates/deadline tests green, including boundary and midnight property tests.

**Manual verification:** none beyond tests (pure engines).

**Commit:** `feat: temporal + estimates + deadline engines (slice 2)` · **Rollback point:** slice 1 commit.

---

## Slice 3 — Seed Data (actual trip loads)

**Files:**

- Create: `packages/seed-data/schema.ts` (Zod), `src/trip-2026-09.ts`, `src/data-pass-2026-09-05.md`

**Interfaces produced:** `RouteNodeSchema` (`node_type: DESTINATION|HOME`, `role: MANDATORY_DESTINATION|OPTIONAL_DESTINATION|RETURN_WAYPOINT|HOME`, `priority`, `mandatory`), `TripSeedSchema` (11 nodes: 9 MANDATORY_DESTINATION + Vijayawada RETURN_WAYPOINT + Narsapuram HOME; 10 legs with `Estimate`-typed ranges + confidence; daily routine blocks; fatigue config defaults; risk thresholds; hard-deadline constant), and validated `trip2026_09` export.

**Dependencies:** Slice 1. **Parallelizable:** data research/authoring runs alongside Slice 2; schema work alongside both.

**Tests (Zod validation):** schema rejects: missing HOME node · zero destination nodes · negative durations · estimate missing `status`/`confidence` · a `status: UNKNOWN` field presented as a precise verified value.

**Acceptance criteria:** `trip2026_09` validates clean; 11 nodes with correct roles; 10 legs with ranges; deadline constant `2026-09-13T03:00+05:30` present; every `UNKNOWN` field carries a documented conservative assumption (see `data-pass-2026-09-05.md`).

**Manual verification:** seed loads in the app dev shell (temporary debug view or checklist screen from Slice 4 — a simple "trip loaded: 11 nodes" indicator is acceptable at this slice).

**Commit:** `feat: seed trip 2026-09 (slice 3)` · **Rollback point:** slice 2 commit.

---

## Slice 4 — Event Log, State Projection & Checklist (user actions change state)

**Files:**

- Create: `packages/core/src/state.ts`; event schemas added to `packages/seed-data/schema.ts`
- Create: `apps/web/src/screens/Checklist.tsx`, `src/hooks/useTripStore.ts`

**Interfaces produced:**

```text
// schema.ts — TripEvent union (Zod), each with provenance:
// { actual_event_time, recorded_at, source: USER|GPS|NETWORK|SYSTEM }
TRIP_STARTED · ARRIVED · DEPARTED · ACTIVITY_COMPLETED · CHECKLIST_TOGGLED
DESTINATION_COMPLETED · DESTINATION_SKIPPED · DELAY_ADDED · TIME_UPDATED
LOCATION_UPDATED · ESTIMATE_VERIFIED · EVENT_CORRECTED · REST_STARTED
REST_COMPLETED · STOP_ADDED · STOP_REMOVED · ROADMAP_RECOMPUTED

// state.ts
rebuildProjection(events) -> TripProjection {
  nodes: { [id]: { status: PENDING|ACTIVE|COMPLETED|SKIPPED, checklist } },
  current_node, current_activity,
  fatigue_counters,      // from DEPARTED/ARRIVED/REST events
  clock_model            // trip now, skew status
}
```

**Dependencies:** Slices 2–3.

**Tests:**

- Each event type applied to a base projection.
- **Rebuild property tests (fast-check):** `rebuild(rebuild(x)) === rebuild(x)` (idempotence); `rebuild([]) === initialProjection`; shuffled event order (sorted by `(actual_event_time, seq)`) yields the same projection.
- `DELAY_ADDED` appends an auditable event; provenance fields preserved.
- Checklist toggle → node checklist state changes; mandatory-gate logic; logged override path.

**Acceptance criteria:** all event-application + rebuild property tests green; checklist screen functional with live state.

**Commit:** `feat: event log + projection + checklist screen (slice 4)` · **Rollback point:** slice 3 commit.

---

## Slice 5 — Roadmap Engine (actual trip recalculates; ETA ranges + risk + why)

**Files:**

- Create: `packages/core/src/roadmap.ts`, `plan-diff.ts`, `humanize.ts`
- Create: `apps/web/src/screens/Home.tsx`, `Roadmap.tsx`, components (`TimePicker`, `RiskBadge`, `EtaRange`, `DelayButton`), `src/lib/engine-adapter.ts`

**Interfaces produced:**

```text
// roadmap.ts
computeRoadmap(projection, seed, config, now) -> RoadmapResult {
  legs: [{ from, to, route_duration: Range, confidence }]
  stop_plan: [{ node, planned_arrival_range, window_check,
                activities, planned_departure_range }]
  home_eta_range: { optimistic, expected, conservative }
  infeasible_flags: [...]      // window violations under CONSERVATIVE arrival
  risk: SAFE|TIGHT|AT_RISK|CRITICAL|IMPOSSIBLE   // from CONSERVATIVE buffer
}

// plan-diff.ts
diffPlans(previous, next, triggerEventIds) -> { trigger, changes[], reason }

// humanize.ts — all user-facing strings use advisory language
```

**Dependencies:** Slices 2–4.

**Tests:**

- Range accumulation across the full 11-node chain; conservative arrival vs temple-window checks.
- IMPOSSIBLE branch: sacrifice chain (optional → RETURN_WAYPOINT degrade → soft-mandatory drop with explicit confirmation).
- plan-diff reason generation; scenario tests **A–F, K, N, O, P, Q** (per roadmap §30): on-time · +2h Tirupati · +3h Tiruvannamalai · Rameswaram delay · infeasible legs · what-if · clock skew · **O: no live/optimistic input can flip AT_RISK→SAFE (structural: feasibility functions accept only conservative inputs)** · P: unknown queue duration stays unknown with conservative assumption · Q: delay action produces auditable event + recalc.

**Acceptance criteria:** `computeRoadmap` on the real seed produces sane ETA ranges; scenario suite green; Home + Roadmap screens live against real seed data.

**Commit:** `feat: roadmap engine + home/roadmap screens (slice 5)` · **Rollback point:** slice 4 commit.

---

## Slice 6 — Safety & Fatigue (rest recommendation works — last pre-trip engine slice)

**Files:**

- Create: `packages/core/src/constraints.ts` (fatigue section)
- Modify: `apps/web/src/screens/Home.tsx` (fatigue advisory display)

**Interfaces produced:**

```text
// constraints.ts
evaluateFatigue(events, config) -> {
  continuous_drive_min, drive_24h_min, night_drive_min,
  breaches: [{ rule, threshold, actual, severity: ADVISORY }]
}
applyFatigueToRoadmap(roadmap, fatigue, config) -> roadmap with mandatory
  breaks inserted before optional items; all outputs labeled ADVISORY
```

**Dependencies:** Slices 2–5.

**Tests:**

- Scenario **L** (fatigue → REST NOW over attraction) — must-pass.
- Boundary tests per configurable limit (`max_continuous_drive_minutes` default 180 → breach at 180/181; same pattern for the other three parameters).
- Advisory-language test: rendered advisory strings must not contain "guaranteed", "medically", "certified".

**Acceptance criteria:** scenario L, boundary, and language tests green; Home shows fatigue advisory.

**Commit:** `feat: fatigue rules + rest advisory (slice 6)` · **Rollback point:** slice 5 commit. **End of Slice 6 = trip-ready deterministic core.**

---

## Slice 7 — Offline/PWA Hardening + Real-Device Release Gate

**Files:**
- Modify: `apps/web/vite.config.ts` (SW precache completeness, `navigateFallback`, manifest icons/standalone)

**Dependencies:** Slices 1–6.

**Scope:** full SW precache of app shell + assets; offline deep-link fallback; install prompt; then the **P0 release gate on the actual family phone**:

```text
INSTALL PWA → CLOSE APP → REOPEN → ENABLE AIRPLANE MODE → LOAD TRIP
→ CHECKLIST WORKS → TIME UPDATE WORKS → DELAY BUTTON WORKS
→ ROADMAP RECALCULATES → WHAT-IF WORKS → RELOAD APP → DATA STILL EXISTS
```

Plus: devtools network tab shows **zero** non-SW requests in airplane mode (no accidental fetches in the core path — engines are structurally pure); no blank screen; no lost state; SW intact; IndexedDB intact.

**Acceptance criteria:** §24 gate checklist fully green on the actual phone. Failure of any step = MVP-A not release-ready.

**Commit:** `feat: offline hardening + real-device gate (slice 7)` · **Rollback point:** slice 6 commit. **End of Slice 7 = MVP-A release-ready.**

---

## Slice 8 — AI-Lite (OPTIONAL — skip without penalty)

**Preconditions (both required):** Slices 1–7 gate-green **and** OmniRoute verification complete (API availability, integration, model aliases, tool-calling support, latency, error semantics, token cost). No key ever printed or logged; env names/endpoints are honestly UNKNOWN until verified.

**Scope:** read-only tool registry via `engine-adapter` (`get_trip_state`, `get_current_time`, `get_deadline_buffer`, `get_remaining_route`, `get_fatigue_status`, `simulate_change` — returns projection, never mutates) + small typed agent loop (no framework) + Chat screen. **No mutating tools exist in AI-Lite — state mutation is structurally impossible.**

**Tests:** read-only tool contract tests; adversarial: unavailable tool → graceful message; injection strings in content → no tool execution; every AI state claim traceable to a tool-call id.

**Commit:** `feat: AI-Lite chat (slice 8)` · **Rollback point:** slice 7 commit.

---

## Release gates summary

- **G1** (end of Slice 2): temporal/deadline property tests green.
- **G2** (end of Slice 5): scenarios A–F, K, N, O, P, Q green — deterministic core runs the real trip.
- **G3** (end of Slice 6): scenario L green → **trip-ready deterministic core**.
- **G4** (end of Slice 7): real-device offline gate green → **MVP-A release-ready**.
- Slice 8 never gates the trip.

## Parallelizable work

- Slice 3 seed-data research (temple hours, distances, durations) runs **in parallel with Slice 2** engine work — the critical-path item to start earliest.
- Schema authoring (Slice 3) can start immediately after Slice 1.

## Critical path

`1 → 2 → 4 → 5 → 6 → 7` with Slice 3 in parallel; Slice 8 optional.

## Final scope check

Every `MUST HAVE` item from roadmap §33 is covered by Slices 1–7; nothing outside the §33 scope lock appears in this plan; Slice 8 is optional per roadmap §29. Every slice ends runnable, with a commit boundary and rollback point.
