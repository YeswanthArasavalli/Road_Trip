# TRIP OS — MASTER ROADMAP (v2 — Phase 0.1 Reconciled)

**Live AI Road Trip & Pilgrimage Operating System**
Canonical architecture document. Amended by the Phase 0.1 architectural review.
Reference date: **September 4, 2026**. Real trip departs: **September 6, 2026 (~8–9 PM IST)**.

**Status: PLANNING ONLY. Implementation is not authorized until the explicit instruction `APPROVED — START MVP-A IMPLEMENTATION`.**

Verification labels: **VERIFIED** (checked in-session), **INFERRED** (prior knowledge — verify before building on it), **PROPOSED** (recommendation), **UNKNOWN — REQUIRES VERIFICATION**.

---

## 1. Executive Summary

TRIP OS is a **deterministic-first, offline-first, mobile-first PWA** that maintains live trip state for a real 8-person family pilgrimage (Maruti Ertiga, 1 driver), recomputes the remaining roadmap on every state change, enforces a hard return deadline (**2026-09-13T03:00:00+05:30**), and exposes an AI layer over typed tools — never as the source of truth.

Foundation (locked): **trip state + append-only event history + deterministic constraint/deadline/roadmap engine**. AI is a layer. Map is a layer. Scraper is a layer. UI is a layer.

Key facts:

- **Repository is empty** (VERIFIED): one commit, `.gitattributes` only. Greenfield.
- **Toolchain (VERIFIED):** Node v24.14.1, npm 11.19.0, pnpm 11.24.0, Python 3.14.6.
- **OmniRoute contract UNKNOWN** (env inspection blocked in Phase 0) — AI-Lite remains optional until verified.
- **Runway is ~2 days.** MVP-A is a **scope-locked, vertical-slice** build (§33, §29): every slice ends with a runnable app. The trip must survive with **AI = OFF, MAPS = OFF, APIFY = OFF, INTERNET = OFF** (§24).

**Amendments in v2 (see `TRIP_OS_CHANGELOG_PHASE_0_1.md` for full rationale):** 11 route nodes with role semantics (HOME is not a sightseeing stop) · event log is the authoritative local history · confidence + optimistic/expected/conservative ranges on all estimates · **home ETA is a range and only the conservative value determines safety** · live traffic can never create false safety · **driver fatigue reclassified P0** · first-class "WE ARE DELAYED" action · three-time-concept model (device/trip/network) with event provenance · AI split into AI-Lite (trip-eligible) and AI-Full (later) · vertical slices with a P0 real-device offline gate.

---

## 2. Product Definition

### 2.1 What it is

A **real-time, stateful, constraint-aware trip operating system** that:

1. Continuously maintains current trip state (position, time, completed activities, checklist).
2. Recalculates the remaining roadmap deterministically on every state change.
3. Manages deadlines, buffers, and risk levels **without an LLM**, using conservative projections.
4. Provides live recommendations (rest / skip / nearby opportunity) from a scoring engine.
5. Exposes a conversational AI layer that reads state and mutates it **only through validated tools**.

### 2.2 What it is not

Not an itinerary generator, chatbot wrapper, checklist app, or Maps skin. The LLM never invents or computes trip state; the deterministic engine never calls an LLM.

### 2.3 Locked trip facts (seed data, not hardcoded logic)

| Item | Value |
|---|---|
| Group | 7 family members + 1 driver (8 total) |
| Vehicle | Maruti Suzuki Ertiga |
| Start | Narsapuram, Andhra Pradesh |
| Departure | Sun 2026-09-06, ~20:00–21:00 IST |
| Normal return target | Narsapuram during Sat 2026-09-12, ideally well before midnight |
| **Absolute hard deadline** | **`2026-09-13T03:00:00+05:30` (Asia/Kolkata)** |
| Timezone | `Asia/Kolkata` (UTC+05:30, no DST) |

The 03:00 deadline is an **emergency ceiling, not a target**. Nothing may be labeled SAFE if the **conservative** projection crosses it.

### 2.4 Route nodes — 11 total (Correction #1)

**10 travel destinations/stops + 1 terminal HOME node.** Narsapuram appears twice in the route description (origin and terminus) but is modeled as a single HOME node.

| # | Node | Role (initial config) |
|---|---|---|
| 1 | Tirupati | MANDATORY_DESTINATION |
| 2 | Srikalahasti | MANDATORY_DESTINATION |
| 3 | Kanipakam | MANDATORY_DESTINATION |
| 4 | Tiruttani | MANDATORY_DESTINATION |
| 5 | Kanchipuram | MANDATORY_DESTINATION |
| 6 | Tiruvannamalai | MANDATORY_DESTINATION |
| 7 | Srirangam | MANDATORY_DESTINATION |
| 8 | Madurai | MANDATORY_DESTINATION |
| 9 | Rameswaram | MANDATORY_DESTINATION |
| 10 | Vijayawada | **RETURN_WAYPOINT** (short visit possible; sacrificable without "failing" a pilgrimage destination) |
| 11 | Narsapuram | **HOME** (terminal node — never treated as sightseeing) |

Node model:

```text
route_node {
  node_type: DESTINATION | HOME
  role:       MANDATORY_DESTINATION | OPTIONAL_DESTINATION |
              RETURN_WAYPOINT | HOME
  // sacrifice order is derived from role + explicit priority, never hidden
}
```

Under schedule pressure a RETURN_WAYPOINT degrades to drive-through / short visit / skipped-sightseeing — a normal mode for that role, distinct from skipping a MANDATORY_DESTINATION (which always requires explicit user confirmation).

### 2.5 Behavioral rules encoded in the product

- **Temple pattern:** arrive → darshan → prasadam/temple food → short photos → depart. No elaborate sevas/pujas.
- **Mobility:** no Girivalam, no hill climbing on foot, minimize walking, elderly-friendly; walking/parking/stairs are node attributes that surface as warnings.
- **Daily routine (hard rule):** wake → bath → washroom → get ready → *only then* food → activities. `BATH`, `WASHROOM`, `GET_READY`, `FOOD`, `REST`, `SLEEP` are schedulable mandatory blocks.
- **Food:** temple prasadam preferred; outside food only when necessary; vegetarian; never auto-suggest restaurants merely for proximity.
- **Product philosophy:** a responsible trip manager that says "No — rest instead."
- **Decision priority (engine ordering):** 1. physical safety → 2. driver safety → 3. hard deadline → 4. mandatory destinations → 5. temple timing feasibility → 6. elderly/family comfort → 7. bath/food/rest requirements → 8. route efficiency → 9. optional attractions → 10. convenience.

### 2.6 Core user questions answered at a glance

Where are we? What time is it? What's completed? What's now? What's next? ETA (range)? On schedule? Buffer remaining? Should we stop/rest/skip? What happens if we spend 45 more minutes here? **When must we leave here to make it home?**

---

## 3. Current Repository Assessment

Unchanged from v1 (VERIFIED): empty repository, one commit (`9cdaf54`), remote `github.com/YeswanthArasavalli/Road_Trip.git`, branch `main`. No framework, package manager, database, env files, tests, CI, or docs. No existing application to preserve — the "existing project rule" is satisfied vacuously.

---

## 4. Recommended Architecture

### 4.1 System overview

```text
                ┌───────────────────────────────────────────┐
                │           PWA (mobile-first SPA)          │
                │  Home / Roadmap / Checklist / Map / Chat  │
                │      Dexie (IndexedDB) — local store      │
                │      Service worker — offline shell       │
                └───────────────┬───────────────────────────┘
                                │ typed API (thin)
                ┌───────────────▼───────────────────────────┐
                │        Backend (Node TS, one service)     │
                │  /proxy/llm      — model routing + keys   │
                │  /proxy/maps     — Maps API + keys        │
                │  /sync  (FUTURE — design boundary only)   │
                └───────┬───────────────┬───────────────────┘
                        │               │
        ┌───────────────▼───┐   ┌───────▼────────────────┐
        │  TRIP CORE (pure) │   │   EXTERNAL PROVIDERS   │
        │  temporal engine  │   │  LLM: OmniRoute→Qwen/  │
        │  state engine     │   │       Gemini/GLM       │
        │  roadmap engine   │   │  Maps: Routes/Places   │
        │  deadline engine  │   │  Apify actors (cached) │
        │  constraint engine│   │  Weather (P3)          │
        │  scoring engine   │   └────────────────────────┘
        │  simulate engine  │
        └───────────────────┘
```

### 4.2 Local-first architecture (Clarified — Correction #2)

**The append-only event log (`trip_events`) is the authoritative local history.** Dexie/IndexedDB is the *storage substrate*, not the truth model.

```text
IndexedDB / Dexie
      ↓
trip_events        ← append-only, authoritative
      ↓
deterministic projection   ← pure rebuild: rebuildProjection(events)
      ↓
derived state (current node, activity, checklist)
      ↓
derived roadmap (ETAs, buffer, risk)
```

Consequences (binding):

- Events are append-only; corrections are new events (e.g. `EVENT_CORRECTED`), never edits.
- **State projections are rebuildable at any time** from the event log — a rebuild test is P0.
- ETA, risk, current destination, current activity, checklist state: **all derived**. No independently mutated projection record is authoritative.
- Every user action is an event with full provenance (§14).

### 4.3 Component decomposition

| Component | Responsibility | Purity |
|---|---|---|
| `core/temporal` | Time math, IST zone, midnight crossing, three-clock model, skew detection | Pure TS |
| `core/state` | Event log, `rebuildProjection()`, derived projections | Pure TS |
| `core/roadmap` | Remaining-roadmap calculation over ranges, feasibility | Pure TS |
| `core/deadline` | Buffer, risk classification, latest-safe-departure | Pure TS |
| `core/constraints` | Hard/soft constraints, routine blocks, mobility, fatigue | Pure TS |
| `core/scoring` | Optional-stop scoring, recommendation ranking | Pure TS |
| `core/simulate` | What-if over cloned state | Pure TS |
| `data/seed` | Sept 6 trip: 11 nodes, windows, ranges, distance table | Data + Zod |
| `app/` | React UI: Home, Roadmap, Checklist, Map, Chat, Settings | UI |
| `server/` | Thin proxy (LLM/Maps keys) — post-MVP-A | Node/Edge TS |
| `ai/` | Tool registry + agent loop + prompt layer — post-MVP-A core | TS |

### 4.4 Data-flow (recalculation)

```text
user action / time tick / checklist tick / location update
        → event appended (trip_events)
        → projection recomputed (pure)
        → roadmap engine recalculates (pure) → ETA RANGE
        → deadline engine → conservative buffer → risk level
        → constraint engine → violations/warnings
        → roadmap_version N+1 stored with trigger, diff, reason
        → UI + AI tools read the new projection
```

---

## 5. Technology Decisions

Unchanged from v1 and reaffirmed:

| Decision | Choice | Justification |
|---|---|---|
| Language | **TypeScript** (strict) | One language across engines, UI, server |
| Frontend | **Vite + React 18 + vite-plugin-pwa** | Fastest path to installable offline PWA |
| Local store | **Dexie (IndexedDB)** | Proven offline substrate (truth = event log on top of it) |
| UI state | **Zustand** | Minimal; engines stay framework-free |
| Validation | **Zod** | Tool/API/seed/event contracts |
| Time | **date-fns-tz** (or Temporal polyfill); fixed `Asia/Kolkata` | Zone-explicit math |
| Tests | **Vitest** + `fast-check` (property tests for time math) | Same toolchain |
| Map rendering (later) | MapLibre GL JS or Maps JS SDK | Rendering decoupled from routing data |
| Backend (later) | Single Node service (Hono) or serverless functions | Secrets + routing only |
| Server DB (future sync only) | PostgreSQL (+PostGIS later) | Not in MVP-A |
| Package manager | **pnpm** (VERIFIED v11.24.0) | |
| Layout | pnpm workspace: `packages/core`, `packages/seed-data`, `apps/web`, `apps/server` | Engines dependency-free |

Rejected for MVP-A (unchanged): Next.js, Redis, Postgres-at-launch, native wrapper, agent frameworks.

---

## 6. Estimation & Confidence Model (New — Corrections #3 & #6)

### 6.1 Every material travel-data field carries provenance

Applies at minimum to: `temple_open_window`, `visit_duration`, `parking_duration`, `walking_duration`, `queue_duration`, `route_duration`, `attraction_open_window`.

```text
estimate<T> {
  status:      VERIFIED | ESTIMATED | UNKNOWN
  confidence:  HIGH | MEDIUM | LOW | UNKNOWN
  value:       T | null            // when single-valued
  range?:      { optimistic, expected, conservative }   // durations/ETA
  source:      string              // e.g. "official temple site"
  retrieved_at: epoch_ms | null
}
```

**Binding rules:**

- A field with `status: UNKNOWN` (e.g. darshan `queue_duration`) **must not silently become a precise number**. It renders as "unknown — using conservative assumption X" with the assumption visible.
- The UI displays status/confidence wherever the value influences feasibility.
- `UNKNOWN` may be upgraded only by an explicit verified input event (`ESTIMATE_VERIFIED`), never by inference.

### 6.2 Range-based estimation (honest uncertainty, minimal math)

Durations carry `{ optimistic, expected, conservative }` (3-point, not a distribution):

```text
route_duration (Narsapuram → Tirupati, night, Ertiga):
  optimistic   8h 50m
  expected    10h 05m
  conservative 11h 30m
```

Seed-data policy: conservative ≈ expected + 10–15% for known legs (configurable); anything with `UNKNOWN` queue/traffic input gets an explicitly documented conservative add-on. **Objective is honest uncertainty, not forecasting sophistication.**

### 6.3 Home ETA is a range (Correction #7)

Roadmap output:

```text
HOME ETA
  Best case       21:10
  Expected        21:45
  Conservative    22:35
  Absolute limit  03:00
```

- **Deadline feasibility uses the CONSERVATIVE ETA. Only that determines risk.**
- Expected ETA is shown for usability; optimistic is informational.
- The optimistic ETA must **never** make an unsafe plan appear safe. Risk badge, buffer countdown, and all feasibility answers (`can_absorb_delay`, `latest_safe_departure`) are conservative-derived.

### 6.4 Live traffic can never create false safety (Correction #8)

```text
LIVE TRAFFIC  → updates/tightens ESTIMATES (mostly expected & optimistic)
BASELINE + CONSERVATIVE MODEL + SAFETY MARGIN → determines feasibility
```

- A live route result is an **input to estimation, never a guaranteed arrival time**.
- When live data arrives: `expected ← live_estimate × correction_factor` (config, ≥1.0 default); `conservative ← max(previous_conservative × decay, expected + uncertainty_margin)` — live data can narrow the range but the conservative bound **never drops below `expected + margin`** while uncertainty exists (margin from config, e.g. 45–90 min on long legs).
- BAD (forbidden): `Maps says 9h42m → SAFE`. GOOD: `Live 9h42m → conservative corrected 11h05m → AT_RISK`.

---

## 7. Deadline Engine (Expanded — Correction #32)

Pure module. Minimum API:

```text
deadline_buffer(now, conservative_home_eta, deadline) → minutes
classify_risk(buffer, thresholds) → SAFE | TIGHT | AT_RISK | CRITICAL | IMPOSSIBLE
latest_safe_departure(position, deadline, must_do[]) → time
can_absorb_delay(minutes) → { feasible: bool, resulting_risk }
project_home_eta(state) → { optimistic, expected, conservative }
required_departure_time(from_node, deadline, must_do[]) → time   // per remaining critical leg
```

`required_departure_time` powers the per-node display:

```text
Latest safe departure from Rameswaram: 16:40 IST
Current planned departure:             17:25 IST
Status: CRITICAL
```

All math is epoch-millisecond + explicit `Asia/Kolkata`; **no date-only shortcuts**; midnight crossing (Sept 12 23:50 → Sept 13 00:10; Sept 13 02:59 → 03:00 → 03:01) is property-tested.

Risk thresholds (config, starting values — **application policy, not universal safety standards**): SAFE > 3h · TIGHT 1.5–3h · AT_RISK 30m–1.5h · CRITICAL < 30m · IMPOSSIBLE = conservative overrun.

## 8. Roadmap Engine

Same accumulation flow as v1, operating on ranges: each leg/stop contributes `{optimistic, expected, conservative}`; totals accumulate per bound; arrival vs temple window checked against the conservative arrival (with expected shown). `IMPOSSIBLE` branch unchanged: sacrifice chain in decision-priority order → skip optional → degrade RETURN_WAYPOINT → propose dropping soft-mandatory with explicit confirmation → surface `required_departure_time` chain.

Every roadmap version records `trigger_event_ids, previous_plan, new_plan, reason, time_of_change, risk_before, risk_after` — "Why did the plan change?" is first-class and deterministically generated (Correction #24):

```text
Roadmap changed.
Trigger:  DELAY_ADDED +60m
Effect:   Kanchipuram no longer fits the available temple window.
Action:   Optional stop removed.
Home ETA: 21:40 → 22:35 (conservative)
```

## 9. Driver Fatigue — P0 Safety (Corrections #9 & #10)

**Reclassified P1 → P0.** Safe-rest enforcement beats destination coverage, always. The engine must be able to answer "REST NOW" when another attraction is available.

**Honest scope statement (binding):** the application **cannot medically determine driver fitness**. It applies **configurable operational rules and warnings**. Every fatigue output is labeled an **advisory**, and config docs must state these are **policy recommendations, not legal requirements**.

Configurable parameters (initial trip uses conservative defaults, all in trip config):

```text
max_continuous_drive_minutes        default 180
recommended_break_minutes           default 20
max_drive_minutes_in_24h            default 600
night_drive_warning_threshold       default 3h continuous between 22:00–06:00
```

Fatigue state derives from events (`DEPARTED`/`ARRIVED`/`REST_STARTED`/`REST_COMPLETED`) — no hidden trackers. When a fatigue rule triggers, the roadmap engine inserts a mandatory break ahead of any optional activity and the UI shows the advisory prominently.

## 10. Constraint Engine

Unchanged from v1, restated: temple-window fit (checked against conservative arrival), routine-block ordering (bath → food hard rule), mobility/elderly warnings, food feasibility (vegetarian, temple-prasadam preference), deadline + fatigue delegation. Results attach to roadmap versions → visible in the "why" panel.

## 11. Trip State Model

- Per-node machine: `PENDING → ACTIVE → COMPLETED | SKIPPED` (reversible via new events while trip is live). Trip-level: `NOT_STARTED → IN_PROGRESS → RETURNING → COMPLETE | ABORTED`.
- All state is projection-derived from events (§4.2). `rebuildProjection(events) → TripProjection` is a pure, tested function.
- Activity expansion per node: `TRAVEL → PARK → [morning routine blocks] → DARSHAN → FOOD → PHOTOS → DEPART`, ordered by template + family rules; HOME node has arrival-only activities.
- **Optional vs mandatory is explicit (Correction #22):** `role` + `priority` fields; the sacrifice order (mandatory destination → soft destination → optional sightseeing → rest) is data-driven config, never hidden rules.

## 12. Checklist System

Unchanged from v1: per-node configurable checklists, event-backed toggles (`CHECKLIST_TOGGLED`), mandatory items gate completion with logged override, one-tap large controls, offline-first.

## 13. Location System

Unchanged: **manual-first** ("I'm at [node]" one-tap picker is the primary mode); foreground GPS on explicit user action; snapshots carry `source + accuracy`; GPS-vs-user mismatch → ask, don't guess; no background tracking (assumed unavailable on iOS Safari — UNKNOWN, not designed around).

## 14. Time Model — Three Clocks (New — Correction #12)

```text
DEVICE NOW              device clock (may be stale/wrong)
TRIP NOW                the trip's operational "now" used by engines
VERIFIED NETWORK TIME   from any network time source when online
```

Every event carries:

```text
actual_event_time   // what the user says happened ("we left at 23:18")
recorded_at         // device clock when the event was recorded ("23:20")
source              // USER | GPS | NETWORK | SYSTEM
```

**Binding rules:**

- User-provided `actual_event_time` is **never silently overwritten** by the device clock. Engines compute with `actual_event_time` where provided, else `recorded_at`.
- `TRIP NOW` = verified network time when available and trusted, else device clock **with a visible staleness warning**.
- **Device clock skew (Correction #13):** when network time is available, compare; if skew > configurable threshold (default 2 min), show `⚠️ Device time may be incorrect`. Historical user events are **never auto-rewritten**; verified time is used for future SYSTEM-sourced operations. Documented behavior: skew is surfaced, not silently corrected.

## 15. "WE ARE DELAYED" — First-Class Action (New — Correction #11)

Prominent Home-screen action: **🚨 WE ARE DELAYED** → quick options `+15m / +30m / +1h / +2h / Custom` → creates an auditable event:

```text
DELAY_ADDED { amount_minutes, source: USER, note? }
```

Deterministic recalculation follows. **Delays are never implemented by silently editing timestamps** — always an event, always auditable, always visible in roadmap history.

## 16. AI Strategy — AI-Lite vs AI-Full (Correction #14)

AI is **not** wholly post-trip. Split:

### AI-Lite — eligible for the real trip (only after deterministic core is stable; Slice 8, optional)

Read-oriented minimal copilot. Allowed: read trip state through tools, call deterministic tools, explain deterministic results. Typical queries: "What is next?" · "How much buffer?" · "Why are we at risk?" · "How many destinations remain?" · "Are we running late?" · "Should we rest per the engine?" · "What is our projected home time?"

**AI-Lite must never become necessary for the app to function.** Same rule as ever: for simple values, zero LLM — engine → template → UI.

### AI-Full — later (post provider verification)

Nearby attractions, Maps-assisted recommendations, Apify enrichment, complex itinerary reasoning, NL itinerary modifications.

### AI does not calculate the trip (Correction #16)

For "What is our buffer?" / "Can we reach home?" / "What happens if we wait 45 more minutes?" — the LLM **never independently computes truth**:

```text
User → AI → typed deterministic tool → engine → result → AI explanation
```

Provider abstraction (Qwen / Gemini / GLM / future), routing table, cost control, and failure semantics carry over from v1 §6 unchanged. **Before AI-Lite: verify API availability, OmniRoute integration, model aliases, tool-calling support, latency, error semantics, token cost. No key ever printed.** Do not invent OmniRoute env var names or endpoints — honest UNKNOWNs.

## 17. Tool Inventory

Same two classes as v1 (read-only auto-executable; mutating = Zod-validated + policy + UI confirm), with additions: `required_departure_time` tool, and mutating tools that worsen conservative risk must return the warning payload for the confirm dialog. Human override never relabels an unsafe plan safe.

## 18. Maps Strategy / 19. Apify Strategy

Unchanged substance from v1 §7–8, restated tighter: Maps/Apify are **outside deterministic MVP-A**. Maps later provides live route, travel-time correction (per §6.4 rules), nearby places — never mandatory for offline core. Apify is enrichment only, confidence-capped, **never an input to hard-deadline safety**. All capability claims remain INFERRED/UNKNOWN until verified.

## 20. Offline Strategy

Unchanged substance: SW precache shell + Dexie data + pure engines + queued local writes. **No core trip calculation may require a fetch request** (Correction #25). MVP-A is one local trip; sync is a documented design boundary only (§23). UI shows capability badges: `ONLINE / OFFLINE (full core) / DEGRADED (no maps/LLM)` — with explicit indication when live capabilities are unavailable (Correction #19).

## 21. Trip-Works-With-Everything-Off Guarantee (New — Correction #19, binding)

With `AI = OFF, MAPS = OFF, APIFY = OFF, INTERNET = OFF`, all of the following must work: trip state · checklist · manual location · manual time · delay updates · roadmap · deadline · risk · fatigue · what-if · remaining destinations · home ETA (range) · offline persistence. This is P0 acceptance, tested on-device (§24).

## 22. Database Architecture

Same table set as v1 §10, amended:

- `trip_events` — authoritative, append-only; `{ id, trip_id, seq, actual_event_time, recorded_at, source, type, payload (Zod), client_seq }`.
- `route_nodes` replaces flat destinations with `{ node_type, role, priority, mandatory }` (§2.4).
- All duration/window fields are `estimate<T>` values (§6.1).
- `roadmap_versions` gains `risk_before/risk_after`, `eta_range`, full trigger provenance.
- Rebuildability: projection tables are derivable; a nightly + on-demand `rebuildProjection` check verifies event-log↔projection consistency.
- Timestamps: epoch ms + explicit trip `tz`; three-clock model per §14.

## 23. Sync — Design Boundary Only (Correction #26)

Retain as future possibility; **do not build in MVP-A.** Documented boundary: event format is already sync-shaped (append-only, client_seq ordering); future conflict model = append-only union + explicit-intent precedence; identity/auth requirements listed for later. No server event store, multi-device sync, server DB, auth, or conflict UI in MVP-A.

## 24. MVP-A Release Gate — Real Device Offline Test (Strengthened — Correction #18)

**P0 RELEASE GATE.** MVP-A is not "done" until the actual family phone demonstrates the full sequence:

```text
INSTALL PWA → CLOSE APP → REOPEN → ENABLE AIRPLANE MODE → LOAD TRIP
→ CHECKLIST WORKS → TIME UPDATE WORKS → DELAY BUTTON WORKS
→ ROADMAP RECALCULATES → WHAT-IF WORKS → RELOAD APP → DATA STILL EXISTS
```

Plus verification of: no accidental network dependency · no blank screen · no lost trip state · no broken service worker · no corrupted IndexedDB. Failure of any step = MVP-A not release-ready.

## 25. Safety Language (New — Correction #30, binding)

UI and docs must distinguish **ENGINE CALCULATION** from **SAFETY ADVISORY**, and never imply: medically certified fatigue detection · guaranteed arrival time · guaranteed road conditions · guaranteed temple availability · guaranteed traffic. Use "estimated / projected / conservative / advisory / based on cached data" wherever applicable. Risk thresholds and fatigue parameters are labeled application policies.

## 26. UI/UX Architecture

Five screens as v1 (Home / Roadmap / Checklist / Map / Chat), amended: Home adds **🚨 WE ARE DELAYED** (§15) and the ETA range + "latest safe departure" for the current node; Roadmap shows per-leg ranges and the "why" drawer; everything uses conservative values for risk color. Mobile-first, oversized controls, high contrast, minimal typing, elderly-friendly, dark mode for night driving. Time selectors everywhere — never chat-only.

## 27. Security / Privacy

Unchanged from v1: secrets server-side only (proxy), rate limits, allowlisted outbound (SSRF), tool authorization, redacted logging; location minimization with export/delete. MVP-A adds nothing network-facing (no server in MVP-A at all — keys only needed when AI/Maps phases run).

## 28. Observability

Local structured logging + exportable diagnostic bundle (engine recalc triggers/durations, provider calls, tool calls, errors). Secret redaction; no raw GPS/PII in logs. Server-side observability arrives with the proxy post-MVP-A.

## 29. Development Phases — Vertical Slices (Replaces v1 phase table — Correction #17)

Every slice ends in a **runnable application**. No giant-bang integration. Order, dependencies, and gates below; full detail in `TRIP_OS_MVP_A_IMPLEMENTATION_PLAN.md`.

```text
Slice 1  Foundation          → app boots (offline shell)
Slice 2  Temporal/deadline   → deadline demo works (property-tested)
Slice 3  Seed data           → actual trip loads (11 nodes, validated)
Slice 4  Event/state/checklist → user actions change state (rebuildable)
Slice 5  Roadmap             → actual trip recalculates (ETA ranges, risk)
Slice 6  Safety/fatigue      → rest recommendation works (P0)
Slice 7  Offline/PWA         → works in airplane mode
Slice 8  AI-Lite             → ONLY if time and core stability allow
GATE     Real-device offline test (§24) — before departure
```

Post-trip phases (Maps → AI-Full → Apify → nearby engine → sync) follow the gate, each behind provider verification.

## 30. Testing Strategy

Carried from v1 §25 with amendments: property tests for time math (midnight, skew); **rebuild test** (event log → projection → identical projection twice); conservative-feasibility tests (optimistic never drives risk); range accumulation tests; fatigue-rule tests (scenario L must-pass); scenario matrix A–N extended with: **O — live-traffic cannot flip AT_RISK→SAFE**; **P — unknown queue duration renders/behaves as unknown with conservative assumption**; **Q — delay action produces audit event + recalc**; **R — rebuild from event log after simulated corruption**.

## 31. Requirement Matrix (Reclassified — Correction #34)

| ID | Requirement | Pri | Component | Depends | Test |
| --- | --- | --- | --- | --- | --- |
| R1 | Deterministic trip state + event history (authoritative) | **P0** | core/state | R5 | Rebuild + transition tests |
| R2 | Roadmap calculation | **P0** | core/roadmap | R1,R3 | Scenario A–F |
| R3 | Hard deadline + conservative feasibility | **P0** | core/deadline | R6 | Scenarios G,N + property |
| R4 | **No false-safe output** (conservative always governs) | **P0** | core/deadline+roadmap | R3 | Scenario O |
| R5 | Seed trip data (11 nodes, validated, not logic) | **P0** | seed-data | — | Zod validation |
| R6 | Offline operation (core) | **P0** | PWA+Dexie+core | — | Scenario H |
| R7 | **Real-device offline verification** | **P0** | release gate | R6,R8 | §24 checklist |
| R8 | Manual time/location updates | **P0** | UI+state | R1 | Scenario B/D |
| R9 | **Driver fatigue safety (advisory rules, P0)** | **P0** | core/constraints | R2 | Scenario L |
| R10 | Core checklist | **P0** | core/state+UI | R1 | Unit |
| R11 | Core works with all external services off | **P0** | all | R1–R10 | §21 checklist |
| R12 | Confidence/status on estimates; unknown ≠ precise | **P0** | estimates | R5 | Scenario P |
| R13 | ETA ranges; conservative feasibility | **P0** | core/roadmap | R3 | Unit+property |
| R14 | WE ARE DELAYED action (auditable) | **P0** | UI+state | R1 | Scenario Q |
| R15 | Three-clock model + skew warning | **P0** | core/temporal | — | Unit |
| R16 | What-if simulation (conservative-based) | P1 | core/simulate | R2 | Scenario K |
| R17 | Elderly/mobility warnings | P1 | constraints+UI | R5 | Unit |
| R18 | Risk visualization + latest-safe-departure | P1 | UI+deadline | R3 | Scenario E/F |
| R19 | Audit / why-changed explanations | P1 | roadmap_versions | R2 | Unit |
| R20 | AI-Lite (optional; tools only; never required) | P1 | ai/ + proxy | R2, OmniRoute verify | AI-tool suite |
| R21 | PWA usability/installable | P1 | apps/web | — | §24 gate |
| R22 | Live Maps route correction | P2 | maps/ | §6.4 rules | Integration |
| R23 | Nearby opportunity engine | P2 | scoring | R22 | Scenario |
| R24 | Apify enrichment (never deadline input) | P2 | external | R5 | Fixtures |
| R25 | AI-Full (recommendations, NL edits) | P2 | ai/ | R20 | — |
| R26 | Emergency info panel | P2 | UI+data | R5 | Static |
| R27 | Multi-device sync | P2 | sync boundary | R1 | Design doc only |
| R28 | Weather input (advisory) | P3 | external | R23 | — |
| R29 | Localization | P3 | UI | — | — |
| R30 | Multi-trip / fleet | P3 | schema | R27 | — |

## 32. Risk Register

v1 register stands, amended: fatigue risk mitigation is now structural (P0 rules + must-pass scenario L) rather than advisory. New/updated entries:

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| 1 | 2-day runway → scope creep | HIGH | §33 scope lock; vertical slices; AI-Lite explicitly optional |
| 2 | Temple/duration data wrong → bad feasibility | HIGH | ranges + conservative margins + visible confidence; user override |
| 3 | False safety from optimistic/traffic data | HIGH | §6.3–6.4 binding rules; scenario O must-pass |
| 4 | Device clock wrong during trip | MED | §14 skew warning + event provenance |
| 5 | Event log / IndexedDB corruption | MED | rebuild test + daily export |
| 6–11 | (as v1: GPS, OmniRoute, Maps pricing, injection, cost, PWA quirks) | — | unchanged |

## 33. MVP-A Scope Lock (New — Correction #35)

### MUST HAVE (only what this real trip requires)

Slices 1–7: offline shell · temporal/deadline engine (conservative feasibility) · validated 11-node seed trip · event log + state + checklist · roadmap with ETA ranges + risk + why-changed · fatigue P0 rules · WE ARE DELAYED · manual time/location · what-if basics (+45m, skip) · three-clock model · capability badges · real-device gate.

### SHOULD HAVE (only if implementation time remains after MUST)

Polished what-if presets (sleep 2h, leave now, traffic +1h) · roadmap history/diff view · latest-safe-departure per node on Roadmap screen · daily auto-export of event log · AI-Lite (Slice 8, only if core stable + OmniRoute verified).

### EXPLICITLY DEFERRED

Maps (live route, map view) · Apify · AI-Full · nearby opportunity engine · sync/server/auth/Postgres · emergency panel · weather · localization · multi-trip · native wrapper.

## 34. Deployment

MVP-A: static PWA (any static host) — **no server at all**. `pnpm build` → deploy; local `pnpm dev` works fully offline. Server (proxy) arrives with AI/Maps phases.

## 35. Future Enhancements

As v1 §34, unchanged (multi-trip, live traffic, weather advisory, learned corrections, emergency panel, localization, native wrapper if background needs emerge).

## 36. Final Implementation Sequence

See `TRIP_OS_MVP_A_IMPLEMENTATION_PLAN.md` — the authoritative slice-by-slice pre-trip plan with files, tests, acceptance criteria, manual verification, commit boundaries, rollback points, and release gates.

---

## Architectural Red Flags (self-audit, v2)

- Local-first inversion (client store + event log) — justified and now sharpened: event log is truth, projections rebuildable.
- Honest-complexity items deliberately **not** hidden: ranges add UI/display complexity; three-clock model adds event provenance; rebuild test adds work. All retained because the requirements demand them.
- Remaining watch-items: range accumulation complexity creep (keep 3-point model, no distributions); AI-Lite time pressure (explicitly optional); conservative-margin tuning is seed-data policy, not code.

---

# GO / NO-GO FOR IMPLEMENTATION

```text
ARCHITECTURE READINESS:    88 / 100   (estimation/time/fatigue models now fully
                                       specified; external-provider contracts
                                       still unverified — they are post-MVP-A)
REQUIREMENT READINESS:     82 / 100   (temple ground-truth data + OmniRoute
                                       contract remain open — both are data/
                                       config, not architecture)
SAFETY READINESS:          90 / 100   (conservative-only feasibility, P0 fatigue,
                                       no-false-safe rules are binding + tested)
OFFLINE READINESS:         92 / 100   (zero-fetch core, rebuildable state,
                                       hard device gate)
TECHNICAL RISK:            MEDIUM     (runway-driven, not architecture-driven)

IMPLEMENTATION STATUS:
NOT STARTED — WAITING FOR EXPLICIT APPROVAL
```

**Remaining blockers (genuine only):**

1. **Explicit approval** — the instruction `APPROVED — START MVP-A IMPLEMENTATION`.
2. **Sept 5 data pass** — temple windows, visit/queue/parking/walking inputs for the 10 destination nodes (feeds seed data; can be captured into UNKNOWN + conservative placeholders and refined).
3. *(Blocks Slice 8 only, not MVP-A core)* — OmniRoute/provider verification.

**Companion documents:** `TRIP_OS_MVP_A_IMPLEMENTATION_PLAN.md` · `TRIP_OS_CHANGELOG_PHASE_0_1.md`
