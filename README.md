# TRIP OS

**An offline-first, live trip operating system (PWA) for a real family pilgrimage.**

TRIP OS answers one question continuously and honestly: *given everything that has
happened so far, can this family still reach home before the hard deadline?* It works
with **zero internet** — no map API, no accounts, no network calls of any kind —
because the trip passes through highways with no signal.

---

## The trip this was built for

| | |
|---|---|
| **Party** | 7 family members + 1 driver (elderly member on board) |
| **Vehicle** | Maruti Suzuki Ertiga |
| **Departure** | Sept 6, 2026, evening — Narsapuram, Andhra Pradesh |
| **Hard deadline** | **2026-09-13, 03:00 IST** back at home |
| **Timezone** | Asia/Kolkata (fixed +05:30 offset, no `Date.now()` in core engines) |

**Route (11 nodes, 10 modeled legs):**

Narsapuram *(origin context, not a leg)* → **Srikalahasti** → **Tirupati** → Kanipakam →
Tiruttani → Kanchipuram → Tiruvannamalai → Srirangam → Madurai → Rameswaram →
Vijayawada *(return waypoint — can degrade to a drive-through under pressure)* →
**Narsapuram (HOME)**.

---

## What it does

- **Live roadmap & ETA** — re-plans the remaining trip from *max(now, delay horizon)*
  after every event; every destination gets an ETA range and a risk class.
- **Honest risk classes** — `SAFE / TIGHT / AT_RISK / CRITICAL / IMPOSSIBLE`, computed
  from the **conservative** ETA bound only. An optimistic estimate can never make an
  unsafe plan look safe (structurally enforced + property-tested).
- **One-tap trip actions** — START TRIP, ARRIVED, VISIT COMPLETE, DEPART,
  WE ARE DELAYED (+15/30/60/120 min or custom), TAKE BREAK / BREAK DONE, REST,
  SKIP — every tap is an auditable event, never a silent edit.
- **Driver-fatigue advisories** — 180 min continuous driving / 600 min per 24 h /
  20 min break / night-driving threshold. Advisory wording only.
- **Checklist & routine** — per-destination checklists and a BATH → WASHROOM →
  GET_READY → FOOD routine, sized for a family with an elderly member.
- **"What changed" card** — after any event, a human-language explanation of why the
  plan or risk moved.

## What it deliberately does NOT do (by design)

- No maps, no GPS, no geolocation, no AI, no external APIs, no cloud sync.
- No network request exists in the app shell at all — enforced by a **static no-fetch
  test** (`fetch(`/`XMLHttpRequest` are banned in `apps/web`).
- Data lives in `localStorage` (key `trip-os-events-v1`) on the phone that installed
  the app. Each device keeps its own event log; pick one "trip phone" and stay on it.
- Never uninstall the app or clear site data on the trip phone — that deletes the diary.

---

## Architecture

pnpm monorepo, three packages:

```
apps/web/            React 18 + Vite 5 PWA (vite-plugin-pwa, zustand)
  src/App.tsx          Home / Route / Checklist screens, all trip actions
  src/store.ts         zustand store — appends TripEvents, persists to localStorage
packages/core/       Pure, deterministic engines (no I/O, no Date.now())
  state.ts             applyEvent + rebuildProjection — event-sourced fold
  roadmap.ts           computeRoadmap, planFrom, simulateDelay (what-if), waypoint degrade
  deadline.ts          risk classification, buffers — conservative-only
  estimates.ts         Estimate<T>: status/confidence/source/ranges
  temporal.ts, humanize.ts, plan-diff.ts, constraints.ts
packages/seed-data/   Zod schema + the real 2026-09 trip seed (validates at module load)
```

**Core ideas:**

1. **Event sourcing** — the append-only TripEvent log is the only truth. The whole UI
   state is a pure, deterministic fold (`rebuildProjection`) — idempotent and
   shuffle-stable (fast-check property tests).
2. **Estimation honesty** — every material value is `VERIFIED | ESTIMATED | UNKNOWN`
   with a confidence level; an UNKNOWN is never silently rendered as a precise number.
   Darshan queues in the seed are honestly UNKNOWN.
3. **Delay horizon** — a recorded delay shifts the plan's start to
   `max(previous horizon, event time) + amount`; the wall clock absorbs it naturally
   over time. No double-counting, conservative only.
4. **Three-clock model** — device now / trip now / event provenance; historical events
   are never rewritten.

---

## Getting started

Requires **Node 18+** and **pnpm 11** (`packageManager` is pinned; Corepack works).

```bash
pnpm install          # install workspace
pnpm test             # 96 tests, 11 files — unit + property + live-UI (vitest + fast-check)
pnpm dev              # dev server on localhost
pnpm build            # type-check + build all packages; emits the PWA (service worker + precache)
```

## Running on a phone over home Wi-Fi (plan B)

```bash
pnpm build
pnpm phone            # HTTPS preview at https://<laptop-lan-ip>:4173
```

The preview server uses a self-signed certificate (phones only allow installing a PWA
from an HTTPS origin). On the phone, open the URL, accept the one-time security
warning, then use Chrome's **Add to Home screen**. The laptop must stay on and on the
same Wi-Fi; that's why the hosted deploy below is the primary path.

## Deploying (primary path: Vercel)

The repo is deployable two ways, and `apps/web/vercel.json` + the root
`vercel.json` cover both (build command and output directory are set for each
case, and `packageManager` pins pnpm):

1. On [vercel.com](https://vercel.com), sign up with GitHub.
2. **Add New → Project → Import** the `Road_Trip` repository.
3. Set **Root Directory to `apps/web`** (Vercel often pre-fills this when it
   detects the monorepo — keep it). Leave Build Command, Output Directory,
   Install Command, and Framework at their detected values
   (`pnpm run build`, `dist`, `pnpm install`, Vite).
4. Press **Deploy**.

If instead you leave Root Directory **empty**, the root `vercel.json` takes
over and builds `apps/web/dist` from the repo root — that works too. The one
broken combination is a Root Directory set **without** `apps/web/vercel.json`,
which is what the first deploy attempt hit.

You get an HTTPS URL (e.g. `https://road-trip.vercel.app`). Open it **once** on the
trip phone while online, install via **Add to Home screen**, and after that the app
runs with no internet for the whole week. The install pre-caches the entire app shell
(7 precache entries) and service worker.

**Pre-departure gate (run once, on the real phone):** open the installed app in
**airplane mode** — it must show the full plan and respond to taps with zero network.

---

## Test & verification status

- **96/96 tests passing** across 11 files: property tests (idempotence, shuffle
  stability, never-mutate), scenario suite (no-false-safe, UNKNOWN ≠ precise, delay
  audited, REST NOW), schema validation, and live UI interaction tests.
- Build verified from a clean state with the exact command Vercel runs.
- Known gaps are user-side only: the real-device airplane-mode check, and installing
  on the family phone. See the changelog for the full verification history.

## Documentation

- [`TRIP_OS_CHANGELOG_PHASE_0_1.md`](TRIP_OS_CHANGELOG_PHASE_0_1.md) — every amendment
  and verified baseline, slice by slice
- [`TRIP_OS_MASTER_ROADMAP.md`](TRIP_OS_MASTER_ROADMAP.md) — the master spec
- [`TRIP_OS_MVP_A_IMPLEMENTATION_PLAN.md`](TRIP_OS_MVP_A_IMPLEMENTATION_PLAN.md) —
  slice plan and gates
- [`packages/seed-data/src/data-pass-2026-09.md`](packages/seed-data/src/data-pass-2026-09.md) —
  data provenance for every estimate in the seed

## Safety wording

Fatigue and risk outputs are trip-planning advisories, not medical or legal guidance.
The engines always plan from the conservative bound — when the app says CRITICAL,
believe it and adjust the plan.
