// src/main.js
// ─────────────────────────────────────────────────────────────────────────────
// Application entry point.
// This file is loaded first by the browser (see index.html → <script src>).
//
// It does two things:
//   1. Mounts the booking app UI into <div id="app">
//   2. Pings the Appwrite backend to verify connectivity and updates the
//      connection status bar at the top of the page.
//
// HOW TO CUSTOMIZE:
//   • To skip the ping (e.g., in production where you trust the connection),
//     just remove the pingBackend() call at the bottom.
//   • To add global error tracking (e.g., Sentry), init it here before renderApp().
// ─────────────────────────────────────────────────────────────────────────────

import { client } from "./lib/appwrite.js";
import { renderApp } from "./app.js";

// ── Mount the UI ──────────────────────────────────────────────────────────────
// Renders the full booking flow into <div id="app"> in index.html.
renderApp(document.getElementById("app"));

// ── Ping Appwrite ─────────────────────────────────────────────────────────────
// client.ping() verifies that the Appwrite endpoint is reachable.
// The result updates the small connection status bar at the top of the page.
// This was added automatically as part of the Appwrite SDK setup.
async function pingBackend() {
  try {
    await client.ping();
    setConnectionStatus(true);
  } catch (e) {
    // Ping failed — show a warning. The user can still try to book;
    // the booking submit will show a proper error if Appwrite is truly down.
    setConnectionStatus(false);
    console.warn("[rSpace] Appwrite ping failed:", e.message);
  }
}

// ── Update the connection bar in the DOM ──────────────────────────────────────
// Looks for .ping-dot and .ping-text which are rendered by buildConnectionBar() in app.js.
function setConnectionStatus(ok) {
  const dot = document.querySelector(".ping-dot");
  const txt = document.querySelector(".ping-text");
  if (dot) {
    dot.classList.toggle("ok",  ok);
    dot.classList.toggle("err", !ok);
  }
  if (txt) {
    txt.textContent = ok
      ? "Connected to rSpace servers"
      : "Connection issue — check your network or Appwrite setup";
  }
}

// Run the ping after the UI is mounted
pingBackend();
