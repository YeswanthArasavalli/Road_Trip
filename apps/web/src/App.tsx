import React, { useEffect, useMemo, useState } from "react";
import { useTripStore, projectionOf, fatigueOf, SEED } from "./store";
import {
  fmtClock,
  fmtMinutes,
  fmtRangeMinutes,
  riskWording,
} from "@trip-os/core";

/**
 * TRIP OS live shell (plan Slices 4–7): Home / Route / Checklist.
 * Mobile-first, large targets, minimal typing (roadmap §26). Every
 * displayed number is labeled estimated/unknown — honesty in the UI
 * (roadmap §65). Offline by construction: no network calls anywhere.
 */

type Tab = "home" | "route" | "checklist";

const RISK_CLASS: Record<string, string> = {
  SAFE: "risk-safe",
  TIGHT: "risk-tight",
  AT_RISK: "risk-atrisk",
  CRITICAL: "risk-critical",
  IMPOSSIBLE: "risk-impossible",
};

const DEPARTURE_CHECKLIST = [
  { id: "darshan", label: "Darshan completed" },
  { id: "belongings", label: "Belongings checked" },
  { id: "phones", label: "Phones / wallets" },
  { id: "water", label: "Water loaded" },
  { id: "family", label: "Family together" },
  { id: "route", label: "Next route confirmed" },
];

const DAILY_CHECKLIST = [
  { id: "bath", label: "Bath" },
  { id: "washroom", label: "Washroom" },
  { id: "ready", label: "Get ready" },
  { id: "food", label: "Food" },
  { id: "medicines", label: "Medicines" },
  { id: "vehicle", label: "Vehicle check" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [now, setNow] = useState(() => Date.now());

  // UI-only minute tick; the engines always receive `now` explicitly.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const events = useTripStore((s) => s.events);
  const lastReason = useTripStore((s) => s.lastReason);
  const roadmap = useTripStore((s) => s.roadmap)(now);

  const projection = useMemo(() => projectionOf(events), [events]);
  const fatigue = useMemo(() => fatigueOf(events), [events]);

  const nextId = roadmap.next_node_id;
  const nextNode = nextId ? SEED.route.find((n) => n.id === nextId) ?? null : null;
  const currentNode = roadmap.current_node_id
    ? SEED.route.find((n) => n.id === roadmap.current_node_id) ?? null
    : null;
  const nextLeg = roadmap.legs.find((l) => l.to === nextId);

  return (
    <div className="shell">
      <header className="shell-header">
        <h1>🚗 TRIP OS</h1>
        <p className="shell-sub">
          {roadmap.progress.completed}/{roadmap.progress.total} temples · {fmtClock(now)}
        </p>
      </header>

      <nav className="tabs" role="tablist">
        {(["home", "route", "checklist"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`tab ${tab === t ? "tab-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "home" ? "Home" : t === "route" ? "Route" : "Checklist"}
          </button>
        ))}
      </nav>

      <main className="shell-main">
        {tab === "home" && (
          <HomeScreen
            currentNode={currentNode}
            nextNode={nextNode}
            nextLegRange={nextLeg?.route_duration}
            roadmap={roadmap}
            fatigueMessage={fatigue.rest_recommended ? "REST recommended — driving advisory limit reached" : null}
            lastReason={lastReason}
            projectionNodes={projection.nodes}
          />
        )}
        {tab === "route" && <RouteScreen roadmap={roadmap} nodes={projection.nodes} />}
        {tab === "checklist" && (
          <ChecklistScreen projection={projection} />
        )}
      </main>
    </div>
  );
}

/* ---------------------------------- Home --------------------------------- */

function HomeScreen({
  currentNode,
  nextNode,
  nextLegRange,
  roadmap,
  fatigueMessage,
  lastReason,
  projectionNodes,
}: {
  currentNode: { id: string; name: string } | null;
  nextNode: { id: string; name: string; visit?: { status: string; range: { optimistic: number; expected: number; conservative: number } } } | null;
  nextLegRange?: { optimistic: number; expected: number; conservative: number };
  roadmap: ReturnType<ReturnType<typeof useTripStore.getState>["roadmap"]>;
  fatigueMessage: string | null;
  lastReason: string | null;
  projectionNodes: Record<string, { status: string; checklist: Record<string, boolean> }>;
}) {
  const [delayOpen, setDelayOpen] = useState(false);
  const appendAction = useTripStore((s) => s.append);
  const atActive = Boolean(currentNode && projectionNodes[currentNode.id]?.status === "ACTIVE");

  return (
    <>
      <section className="card">
        <h2>Current</h2>
        {currentNode ? (
          <>
            <p className="big">{currentNode.name}</p>
            {fatigueMessage && <p className="fatigue">{fatigueMessage}</p>}
          </>
        ) : (
          <p className="big muted">
            {roadmap.progress.completed > 0 ? "Between stops" : "Trip not started"}
          </p>
        )}
        {!useTripStore.getState().events.some((e) => e.type === "TRIP_STARTED") && (
          <button className="action primary" onClick={() => appendAction({ type: "TRIP_STARTED", seed_id: SEED.seed_id })}>
            START TRIP
          </button>
        )}
      </section>

      <section className="card">
        <h2>Next</h2>
        {nextNode ? (
          <>
            <p className="big">{nextNode.name}</p>
            {nextLegRange && <p className="muted">Drive: {fmtRangeMinutes(nextLegRange)} (estimated)</p>}
            {nextNode.visit && (
              <p className="muted">
                Visit ({nextNode.visit.status.toLowerCase()}): {fmtMinutes(nextNode.visit.range.expected)}–
                {fmtMinutes(nextNode.visit.range.conservative)}
              </p>
            )}
            <p className="muted">Leave by ≈ {fmtClock(roadmap.latest_safe_departure)} to protect the deadline</p>
          </>
        ) : (
          <p className="muted">Final stretch — home.</p>
        )}
      </section>

      <section className="card">
        <h2>Deadline</h2>
        <div className={`risk-badge ${RISK_CLASS[roadmap.risk] ?? ""}`}>{roadmap.risk}</div>
        <p>
          Home ETA (conservative): <strong>{fmtClock(roadmap.home_eta_range.conservative)}</strong>
          <br />
          <span className="muted">expected {fmtClock(roadmap.home_eta_range.expected)}</span>
        </p>
        <p>
          Deadline {fmtClock(Date.parse(SEED.hard_deadline))} · slack{" "}
          <strong>{fmtMinutes(roadmap.buffer_minutes)}</strong>
        </p>
        <p className="muted small">{riskWording(roadmap.risk, roadmap.buffer_minutes)}</p>
        {roadmap.stop_plan.some((s) => s.degrade_recommended) && (
          <p className="warn">Vijayawada: drive-through suggested — deadline pressure.</p>
        )}
        {roadmap.infeasible_flags.map((f, i) => (
          <p key={i} className="warn">{f}</p>
        ))}
      </section>

      {lastReason && (
        <section className="card">
          <h2>What changed</h2>
          <p className="small">{lastReason}</p>
        </section>
      )}

      <section className="card">
        <h2>Actions</h2>
        <div className="actions">
          {nextNode && !atActive && (
            <button className="action" onClick={() => appendAction({ type: "ARRIVED", node_id: nextNode.id })}>
              ARRIVED {nextNode.id.toUpperCase()}
            </button>
          )}
          {currentNode && atActive && (
            <button
              className="action"
              onClick={() =>
                appendAction({
                  type: "DESTINATION_COMPLETED",
                  node_id: currentNode.id,
                  actual_duration_minutes: 60,
                })
              }
            >
              VISIT COMPLETE
            </button>
          )}
          {currentNode && atActive && (
            <button className="action" onClick={() => appendAction({ type: "DEPARTED", node_id: currentNode.id })}>
              DEPART
            </button>
          )}
          <button className="action warn-btn" onClick={() => setDelayOpen((v) => !v)}>
            WE ARE DELAYED
          </button>
          {delayOpen && (
            <div className="delay-row">
              {[15, 30, 60, 120].map((m) => (
                <button key={m} className="action small-btn" onClick={() => { appendAction({ type: "DELAY_ADDED", amount_minutes: m, reason: "user-recorded delay" }); setDelayOpen(false); }}>
                  +{m}m
                </button>
              ))}
            </div>
          )}
          <button className="action" onClick={() => appendAction({ type: "REST_STARTED" })}>
            TAKE BREAK
          </button>
          <button className="action" onClick={() => appendAction({ type: "REST_COMPLETED", duration_minutes: 20 })}>
            BREAK DONE
          </button>
        </div>
        <div className="actions routine">
          {(["BATH", "WASHROOM", "GET_READY", "FOOD"] as const).map((a) => (
            <button
              key={a}
              className="action small-btn"
              onClick={() =>
                appendAction({
                  type: "ACTIVITY_COMPLETED",
                  activity: a,
                  node_id: roadmap.current_node_id ?? undefined,
                })
              }
            >
              {a.replace("_", " ")} ✓
            </button>
          ))}
        </div>
        <p className="muted small">BATH → WASHROOM → GET_READY → FOOD before food/activity (trip rule).</p>
      </section>
    </>
  );
}

/* ---------------------------------- Route -------------------------------- */

function RouteScreen({
  roadmap,
  nodes,
}: {
  roadmap: ReturnType<ReturnType<typeof useTripStore.getState>["roadmap"]>;
  nodes: Record<string, { status: string; checklist: Record<string, boolean> }>;
}) {
  return (
    <section className="card">
      <h2>Route — Srikalahasti first, then home</h2>
      <ol className="route-list">
        {roadmap.stop_plan.map((stop) => {
          const node = SEED.route.find((n) => n.id === stop.node_id)!;
          const status = nodes[stop.node_id]?.status ?? "PENDING";
          return (
            <li key={stop.node_id} className={`route-item st-${status.toLowerCase()}`}>
              <div>
                <strong>{node.name}</strong>
                <div className="muted small">
                  {status === "PENDING" && `arrive ≈ ${fmtClock(stop.arrival_range.conservative)} (conservative estimate)`}
                  {status === "ACTIVE" && "you are here"}
                  {status === "COMPLETED" && "completed"}
                  {status === "SKIPPED" && "skipped"}
                  {stop.degrade_recommended && " · drive-through suggested"}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="muted small">
        Times shown are conservative (estimated) values — road conditions
        vary. Unknown queues stay unknown until recorded on the trip.
      </p>
    </section>
  );
}

/* -------------------------------- Checklist ------------------------------ */

function ChecklistScreen({
  projection,
}: {
  projection: { nodes: Record<string, { status: string; checklist: Record<string, boolean> }> };
}) {
  const append = useTripStore((s) => s.append);
  const currentNodeId = Object.keys(projection.nodes).find(
    (id) => projection.nodes[id]?.status === "ACTIVE"
  );

  return (
    <>
      <section className="card">
        <h2>Temple departure{currentNodeId ? ` — ${currentNodeId}` : ""}</h2>
        {DEPARTURE_CHECKLIST.map((item) => {
          const done = currentNodeId
            ? projection.nodes[currentNodeId]?.checklist[item.id] === true
            : false;
          return (
            <label key={item.id} className="check-row">
              <input
                type="checkbox"
                checked={done}
                onChange={() =>
                  append({
                    type: "CHECKLIST_TOGGLED",
                    node_id: currentNodeId,
                    item_id: item.id,
                    done: !done,
                  })
                }
              />
              <span>{item.label}</span>
            </label>
          );
        })}
      </section>
      <section className="card">
        <h2>Daily routine</h2>
        {DAILY_CHECKLIST.map((item) => {
          const done = projection.nodes["_trip"]?.checklist[item.id] === true;
          return (
            <label key={item.id} className="check-row">
              <input
                type="checkbox"
                checked={done}
                onChange={() =>
                  append({ type: "CHECKLIST_TOGGLED", item_id: item.id, done: !done })
                }
              />
              <span>{item.label}</span>
            </label>
          );
        })}
      </section>
    </>
  );
}
