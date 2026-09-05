import React from "react";

/**
 * Slice 1: offline-capable shell.
 * No network fetches anywhere in the render path — the app must boot
 * with zero connectivity (roadmap §21).
 */
export default function App() {
  return (
    <div className="shell">
      <header className="shell-header">
        <h1>🚗 TRIP OS</h1>
        <p className="shell-sub">Offline shell — engines arrive in Slice 2+.</p>
      </header>
      <main className="shell-main">
        <div className="card">
          <p>App shell loaded. Slice 1 complete.</p>
        </div>
      </main>
    </div>
  );
}
