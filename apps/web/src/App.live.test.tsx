import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "./App";
import { useTripStore } from "./store";
import { TripEventSchema, trip2026_09, type TripEvent } from "@trip-os/seed-data";
import { rebuildProjection, computeRoadmap, type RoadmapConfig } from "@trip-os/core";

// Real engine wiring: the UI must reflect what the deterministic engines say,
// not its own arithmetic. localStorage is cleared so persisted trip state
// from another test never leaks in.

const KEY = "trip-os-events-v1";

beforeEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ events: [], lastReason: null });
});

afterEach(cleanup);

describe("live shell — home screen", () => {
  it("shows START TRIP before the trip begins", () => {
    render(<App />);
    expect(screen.getByText("START TRIP")).toBeTruthy();
  });

  it("starts the trip and reflects Srikalahasti as the first stop", () => {
    render(<App />);
    fireEvent.click(screen.getByText("START TRIP"));
    // Route tab lists Srikalahasti first (user-corrected order).
    fireEvent.click(screen.getByRole("tab", { name: "Route" }));
    expect(screen.getByText("Srikalahasti (Srikalahasteeswara Temple)")).toBeTruthy();
  });

  it("records a delay via WE ARE DELAYED and shows the reason", () => {
    render(<App />);
    fireEvent.click(screen.getByText("START TRIP"));
    fireEvent.click(screen.getByText("WE ARE DELAYED"));
    fireEvent.click(screen.getByText("+30m"));
    const events = useTripStore.getState().events;
    expect(events.some((e) => e.type === "DELAY_ADDED" && e.amount_minutes === 30)).toBe(true);
    expect(useTripStore.getState().lastReason).toContain("delay");
  });

  it("hides START TRIP once the trip is running", () => {
    render(<App />);
    fireEvent.click(screen.getByText("START TRIP"));
    expect(screen.queryByText("START TRIP")).toBeNull();
  });
});

describe("live shell — checklist", () => {
  it("toggles a temple-departure item and records a CHECKLIST_TOGGLED event", () => {
    render(<App />);
    fireEvent.click(screen.getByText("START TRIP"));
    fireEvent.click(screen.getByRole("tab", { name: "Checklist" }));
    const water = screen.getByLabelText(/water/i, { selector: "input" });
    expect((water as HTMLInputElement).checked).toBe(false);
    fireEvent.click(water);
    const events = useTripStore.getState().events;
    const toggle = events.find((e) => e.type === "CHECKLIST_TOGGLED");
    expect(toggle).toBeDefined();
    expect(useTripStore.getState().events.length).toBeGreaterThan(1);
  });
});

describe("live shell — engines drive the numbers", () => {
  it("the store's roadmap matches a direct computeRoadmap on the same events", () => {
    const events: TripEvent[] = [];
    const parsed = TripEventSchema.parse({
      type: "TRIP_STARTED",
      seed_id: "trip-2026-09-pilgrimage",
      actual_event_time: "2026-09-06T12:00:00+05:30",
      recorded_at: "2026-09-06T12:00:00+05:30",
      source: "USER",
      event_id: "e1",
    });
    events.push(parsed);
    useTripStore.setState({ events });
    const now = Date.parse("2026-09-06T12:30:00+05:30");
    const storeRoadmap = useTripStore.getState().roadmap(now);
    const config = {
      deadline: Date.parse("2026-09-13T03:00:00+05:30"),
      thresholds: { safeMaxMinutes: 180, tightMaxMinutes: 90, atRiskMaxMinutes: 30 },
      fatigue: {
        max_continuous_drive_minutes: 180,
        max_drive_minutes_in_24h: 600,
        recommended_break_minutes: 20,
        night_drive_warning_threshold_minutes: 180,
      },
    } as RoadmapConfig;
    const direct = computeRoadmap(
      rebuildProjection(events, [
        "srikalahasti", "tirupati", "kanipakam", "tiruttani", "kanchipuram",
        "tiruvannamalai", "srirangam", "madurai", "rameswaram", "vijayawada", "narsapuram",
      ]),
      trip2026_09,
      config,
      now
    );
    expect(storeRoadmap.buffer_minutes).toBe(direct.buffer_minutes);
    expect(storeRoadmap.risk).toBe(direct.risk);
  });
});
