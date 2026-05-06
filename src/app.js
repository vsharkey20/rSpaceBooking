// src/app.js
// ─────────────────────────────────────────────────────────────────────────────
// Main application logic for the rSpace Booking System.
//
// Architecture: vanilla JavaScript SPA (Single Page App) using a simple
// "state → render" pattern. Every user action updates `state`, then calls
// render() which rebuilds the DOM from scratch. No framework required.
//
// FILE STRUCTURE:
//   1. CONSTANTS         — booking types, step definitions (easy to customize)
//   2. STATE             — all app data lives here
//   3. RENDER            — mounts HTML into the DOM
//   4. HTML BUILDERS     — one function per UI section
//   5. EVENT LISTENERS   — one delegated listener, routes to handleAction()
//   6. ACTION HANDLER    — all user interactions handled in one switch block
//   7. ADMIN HELPERS     — load bookings, filter, export CSV
//   8. UTILITY HELPERS   — escape HTML, format dates, show toasts
// ─────────────────────────────────────────────────────────────────────────────

import { PRICING, getPrice, TYPE_LABELS, CUST_LABELS } from "./lib/pricing.js";
import {
  createBooking,
  getAllBookings,
  getBookingsByDate,
  updateBookingStatus,
} from "./lib/bookingService.js";

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  1. CONSTANTS
// ║  Customize these to change what appears in the UI without touching logic.
// ╚══════════════════════════════════════════════════════════════════════════════

// Booking type cards shown on Step 1.
// To add a new type: add an entry here AND add pricing data in pricing.js.
const BOOKING_TYPES = [
  {
    id:    "coworking",
    icon:  "💻",
    label: "Coworking",
    desc:  "Hot desk · Open space",
    badge: null, // Set to a string like "Popular" to show a badge ribbon
  },
  {
    id:    "conference",
    icon:  "🏛️",
    label: "Conference Room",
    desc:  "Private meeting space",
    badge: "Premium",
  },
  {
    id:    "membership",
    icon:  "🌟",
    label: "Membership",
    desc:  "Monthly unlimited access",
    badge: null,
  },
];

// Step indicator labels (Step 1–4 across the top of the booking flow).
// Change labels here if you want different wording.
const STEP_LABELS = [
  { n: 1, label: "Space Type" },
  { n: 2, label: "Rate"       },
  { n: 3, label: "Details"    },
  { n: 4, label: "Confirm"    },
];

// Admin password. IMPORTANT: move this to an environment variable or
// Appwrite Auth for production. For now it's hardcoded for simplicity.
const ADMIN_PASSWORD = "rSpace@2024";

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  2. STATE
// ║  Single source of truth for the entire app. Every render reads from here.
// ╚══════════════════════════════════════════════════════════════════════════════

const state = {
  // ── Booking wizard ──────────────────────────────────────────────────────────
  step:         1,     // Current wizard step: 1 | 2 | 3 | 4 | 5 (success)
  bookingType:  null,  // Selected type: "coworking" | "conference" | "membership"
  customerType: null,  // Selected customer: "regular" | "student"
  duration:     null,  // Selected duration key: "1hr" | "4hrs" | "8hrs" | "12hrs" | "monthly"
  amount:       0,     // Computed price in PHP (auto-set when duration is picked)

  // ── Customer info (Step 3 form) ─────────────────────────────────────────────
  name:        "",  // Required
  email:       "",  // Optional
  phone:       "",  // Optional
  address:     "",  // Optional
  bookingDate: "",  // Required — YYYY-MM-DD string from <input type="date">
  notes:       "",  // Optional

  // ── Submission ──────────────────────────────────────────────────────────────
  submitting:    false,  // True while the Appwrite createDocument call is in-flight
  lastBookingId: null,   // $id of the created document, shown as reference number

  // ── Admin panel ─────────────────────────────────────────────────────────────
  adminOpen:      false,  // Whether the admin slide-up panel is visible
  adminLoggedIn:  false,  // Whether the correct password has been entered
  adminPass:      "",     // Tracks the password input field value
  adminFilter:    "",     // Date string for filtering (empty = show all)
  adminBookings:  [],     // Array of Appwrite documents fetched from the DB
  adminLoading:   false,  // True while fetching bookings from Appwrite
  adminTab:       "list", // "list" | "summary" — which admin sub-view is shown
};

// Root DOM element — set once in renderApp()
let root = null;

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  3. RENDER
// ║  Re-renders the entire UI from state. Called after every state change.
// ╚══════════════════════════════════════════════════════════════════════════════

// Entry point called from main.js
export function renderApp(el) {
  root = el;
  render();
}

// Rebuild the whole DOM and re-attach listeners.
// Because innerHTML is replaced, all old listeners are automatically removed.
function render() {
  root.innerHTML = buildHTML();
  attachListeners();
}

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  4. HTML BUILDERS
// ║  Each function returns an HTML string for one section of the UI.
// ╚══════════════════════════════════════════════════════════════════════════════

// Top-level page structure
function buildHTML() {
  return `
    ${buildConnectionBar()}
    ${buildHeader()}
    ${state.step < 5 ? buildHero() : ""}
    <main class="main">
      ${buildStepIndicator()}
      ${buildCurrentStep()}
    </main>
    ${state.adminOpen ? buildAdminPanel() : ""}
  `;
}

// ── Connection status bar ─────────────────────────────────────────────────────
// Shows a dot + text at the very top. Updated by main.js after ping().
function buildConnectionBar() {
  return `
    <div class="connection-bar">
      <span class="ping-dot"></span>
      <span class="ping-text">Connecting to rSpace servers…</span>
    </div>
  `;
}

// ── Header ────────────────────────────────────────────────────────────────────
// Sticky top bar with logo and a subtle admin button.
// The admin button is intentionally low-contrast so it doesn't distract customers.
function buildHeader() {
  return `
    <header class="header">
      <div class="logo-area">
        ${buildLogoSVG()}
        <div class="logo-text">
          <span class="logo-script">Space</span>
          <span class="logo-sub">Coworking Space</span>
        </div>
      </div>
      <!-- Admin button: low opacity so it's not obvious to customers -->
      <button class="admin-btn" data-action="adminToggle">⚙ Admin</button>
    </header>
  `;
}

// SVG recreation of the rSpace logo (circles + connecting lines)
// Colors are hardcoded to match the brand: yellow circles, black background
function buildLogoSVG() {
  return `
    <svg class="logo-icon" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Large ring (top-left node) -->
      <circle cx="18" cy="13" r="10" fill="#F5D800"/>
      <circle cx="18" cy="13" r="5"  fill="#111111"/>
      <!-- Bottom node -->
      <circle cx="18" cy="46" r="7"  fill="#F5D800"/>
      <!-- Right node -->
      <circle cx="38" cy="20" r="6"  fill="#F5D800"/>
      <!-- Connecting lines -->
      <line x1="18" y1="13" x2="18" y2="46" stroke="#111111" stroke-width="2.5"/>
      <line x1="18" y1="22" x2="38" y2="20" stroke="#111111" stroke-width="2.5"/>
    </svg>
  `;
}

// ── Hero section ──────────────────────────────────────────────────────────────
// Dark banner shown above the booking wizard (hidden on the success screen).
// To change the headline or description, edit the strings below.
function buildHero() {
  return `
    <section class="hero">
      <span class="hero-eyebrow">Reserve Your Spot</span>
      <h1 class="hero-title">Work <em>smarter</em>,<br>not harder.</h1>
      <p class="hero-desc">
        Book your coworking session, conference room, or monthly membership
        in just a few clicks.
      </p>
    </section>
  `;
}

// ── Step indicator ─────────────────────────────────────────────────────────────
// Progress bar at the top of the wizard. Hidden on the success screen (step 5).
function buildStepIndicator() {
  if (state.step === 5) return ""; // No indicator on success screen

  return `
    <div class="steps">
      ${STEP_LABELS.map((s, i) => {
        const isDone   = state.step > s.n;
        const isActive = state.step === s.n;
        const cls      = isDone ? "done" : isActive ? "active" : "";
        return `
          <div class="step-item ${cls}">
            <div class="step-num ${cls}">${isDone ? "✓" : s.n}</div>
            <span class="step-label">${s.label}</span>
          </div>
          ${i < STEP_LABELS.length - 1
            ? `<div class="step-line ${isDone ? "done" : ""}"></div>`
            : ""
          }
        `;
      }).join("")}
    </div>
  `;
}

// Routes to the correct step builder based on state.step
function buildCurrentStep() {
  switch (state.step) {
    case 1:  return buildStep1();
    case 2:  return buildStep2();
    case 3:  return buildStep3();
    case 4:  return buildStep4();
    case 5:  return buildStep5();
    default: return "";
  }
}

// ── STEP 1: Choose Space Type ─────────────────────────────────────────────────
// Renders the three booking type cards (Coworking, Conference, Membership).
// Cards come from the BOOKING_TYPES constant at the top of this file.
function buildStep1() {
  return `
    <div class="card" style="animation-delay:0s">
      <div class="card-title">Choose Your Space</div>
      <div class="card-subtitle">What kind of space do you need today?</div>

      <div class="choice-grid three">
        ${BOOKING_TYPES.map(t => `
          <div class="choice-card ${state.bookingType === t.id ? "selected" : ""}"
               data-action="setType" data-val="${t.id}">
            ${t.badge ? `<span class="choice-badge">${t.badge}</span>` : ""}
            <span class="choice-icon">${t.icon}</span>
            <span class="choice-label">${t.label}</span>
            <span class="choice-desc">${t.desc}</span>
          </div>
        `).join("")}
      </div>

      <div class="btn-actions">
        <div></div><!-- Spacer to push button right -->
        <button class="btn btn-primary" data-action="toStep2"
          ${!state.bookingType ? "disabled" : ""}>
          Continue →
        </button>
      </div>
    </div>
  `;
}

// ── STEP 2: Customer Type + Rate Selection ────────────────────────────────────
// First picks Regular vs Student, then shows the rate cards for the chosen
// booking type and customer type from pricing.js.
function buildStep2() {
  return `
    <div class="card" style="animation-delay:0s">
      <div class="card-title">Who Are You?</div>
      <div class="card-subtitle">Your type determines your rate</div>

      <!-- Customer type picker -->
      <div class="choice-grid" style="margin-bottom:1.5rem">
        <div class="choice-card ${state.customerType === "regular" ? "selected" : ""}"
             data-action="setCust" data-val="regular">
          <span class="choice-icon">👤</span>
          <span class="choice-label">Regular</span>
          <span class="choice-desc">General professional</span>
        </div>
        <div class="choice-card ${state.customerType === "student" ? "selected" : ""}"
             data-action="setCust" data-val="student">
          <span class="choice-icon">🎓</span>
          <span class="choice-label">Student</span>
          <span class="choice-desc">Valid school ID required</span>
        </div>
      </div>

      <!-- Rate cards — only shown once a customer type is selected -->
      ${state.customerType
        ? buildRateSelector()
        : `<div class="rate-placeholder">
             Select your type above to see available rates ↑
           </div>`
      }

      <div class="btn-actions">
        <button class="btn btn-ghost" data-action="toStep1">← Back</button>
        <button class="btn btn-primary" data-action="toStep3"
          ${!state.customerType || !state.duration ? "disabled" : ""}>
          Continue →
        </button>
      </div>
    </div>
  `;
}

// Builds the rate selection grid for the current bookingType + customerType.
// Reads directly from PRICING in pricing.js — no hardcoded prices here.
function buildRateSelector() {
  const rates       = PRICING[state.bookingType]?.[state.customerType];
  const isMembership = state.bookingType === "membership";

  if (!rates) return `<p style="color:var(--gray-500)">No rates available for this selection.</p>`;

  return `
    <div>
      <div class="rate-section-label">Select Duration / Plan</div>
      <!-- Full-width grid for membership (only one option); 4-col for hourly -->
      <div class="rate-grid ${isMembership ? "membership-grid" : ""}">
        ${Object.entries(rates).map(([key, val]) => `
          <div class="rate-card ${state.duration === key ? "selected" : ""}"
               data-action="setDuration" data-val="${key}">
            <span class="rate-duration">${val.label}</span>
            <span class="rate-price">₱${val.price.toLocaleString()}</span>
            ${val.desc ? `<span class="rate-unit">${val.desc}</span>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── STEP 3: Personal Details Form ─────────────────────────────────────────────
// Collects name (required), email, phone, address (optional), date (required),
// and notes. Values are pre-filled from state so Back doesn't clear them.
function buildStep3() {
  // Today's date as the minimum allowed booking date (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];

  return `
    <div class="card" style="animation-delay:0s">
      <div class="card-title">Your Details</div>
      <div class="card-subtitle">Tell us a bit about yourself</div>

      <!-- Full name — required -->
      <div class="form-group">
        <label for="inp-name">Full Name <span class="req">*</span></label>
        <input type="text" id="inp-name"
               placeholder="e.g. Maria Santos"
               value="${esc(state.name)}"
               autocomplete="name" />
      </div>

      <!-- Email + Phone — optional, side by side on wider screens -->
      <div class="form-row">
        <div class="form-group">
          <label for="inp-email">Email <span class="optional">(optional)</span></label>
          <input type="email" id="inp-email"
                 placeholder="you@email.com"
                 value="${esc(state.email)}"
                 autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="inp-phone">Phone <span class="optional">(optional)</span></label>
          <input type="tel" id="inp-phone"
                 placeholder="09XX XXX XXXX"
                 value="${esc(state.phone)}"
                 autocomplete="tel" />
        </div>
      </div>

      <!-- Address — optional -->
      <div class="form-group">
        <label for="inp-address">Address <span class="optional">(optional)</span></label>
        <input type="text" id="inp-address"
               placeholder="City, Province"
               value="${esc(state.address)}"
               autocomplete="street-address" />
      </div>

      <!-- Booking date — required, must be today or future -->
      <div class="form-group">
        <label for="inp-date">Date of Booking <span class="req">*</span></label>
        <input type="date" id="inp-date"
               min="${today}"
               value="${esc(state.bookingDate)}" />
      </div>

      <!-- Notes — optional free text -->
      <div class="form-group">
        <label for="inp-notes">Notes <span class="optional">(optional)</span></label>
        <textarea id="inp-notes" rows="2"
                  placeholder="Any special requests or info for the staff…">${esc(state.notes)}</textarea>
      </div>

      <div class="btn-actions">
        <button class="btn btn-ghost" data-action="toStep2">← Back</button>
        <button class="btn btn-primary" data-action="saveDetails">
          Review Booking →
        </button>
      </div>
    </div>
  `;
}

// ── STEP 4: Review & Confirm ───────────────────────────────────────────────────
// Shows a dark summary card with all the selected details and the total price.
// The submit button is disabled while the Appwrite call is in-flight.
function buildStep4() {
  const priceInfo = getPrice(state.bookingType, state.customerType, state.duration);

  return `
    <div class="card" style="animation-delay:0s">
      <div class="card-title">Review Your Booking</div>
      <div class="card-subtitle">Please check everything before confirming</div>

      <!-- Dark summary card -->
      <div class="summary-box">
        <h4>Booking Summary</h4>

        ${summaryRow("Space Type",     TYPE_LABELS[state.bookingType] || "")}
        ${summaryRow("Customer Type",  CUST_LABELS[state.customerType] || "")}
        ${summaryRow("Duration / Plan", priceInfo?.label || "")}
        ${summaryRow("Name",           state.name)}
        ${state.email   ? summaryRow("Email",   state.email)   : ""}
        ${state.phone   ? summaryRow("Phone",   state.phone)   : ""}
        ${state.address ? summaryRow("Address", state.address) : ""}
        ${summaryRow("Date",           formatDate(state.bookingDate))}
        ${priceInfo?.desc ? summaryRow("Plan Includes", priceInfo.desc) : ""}
        ${state.notes   ? summaryRow("Notes",   state.notes)   : ""}

        <!-- Total amount — prominently displayed -->
        <div class="summary-total">
          <span class="total-label">Total Amount</span>
          <span class="total-price"><sup>₱</sup>${state.amount.toLocaleString()}</span>
        </div>
      </div>

      <p class="payment-note">
        💡 Payment is collected at the venue. This booking is a reservation only.
      </p>

      <div class="btn-actions">
        <button class="btn btn-ghost" data-action="toStep3">← Back</button>
        <button class="btn btn-primary" data-action="submitBooking"
          ${state.submitting ? "disabled" : ""}>
          ${state.submitting
            ? `<span class="spinner"></span> Saving…`
            : "✓ Confirm Booking"
          }
        </button>
      </div>
    </div>
  `;
}

// Helper: one row inside the summary box
function summaryRow(key, val) {
  return `
    <div class="summary-row">
      <span class="key">${key}</span>
      <span class="val">${esc(String(val))}</span>
    </div>
  `;
}

// ── STEP 5: Success / Receipt ─────────────────────────────────────────────────
// Shown after a successful Appwrite createDocument call.
// Displays a booking reference and a printable receipt link.
function buildStep5() {
  const priceInfo   = getPrice(state.bookingType, state.customerType, state.duration);
  const refNumber   = (state.lastBookingId || "").slice(-8).toUpperCase();

  return `
    <div class="card success-screen">
      <!-- Animated checkmark circle -->
      <div class="success-icon">✓</div>

      <h2>Booking <em>Confirmed!</em></h2>
      <p>Your reservation at <strong>rSpace</strong> has been received.<br>
         We'll see you on <strong>${formatDate(state.bookingDate)}</strong>!</p>

      <!-- Reference number for the customer to keep -->
      <div class="booking-ref">REF: ${refNumber}</div>

      <!-- Receipt summary -->
      <div class="receipt-box">
        <div class="receipt-row">${TYPE_LABELS[state.bookingType]} · ${CUST_LABELS[state.customerType]}</div>
        <div class="receipt-row">${priceInfo?.label || state.duration}</div>
        <div class="receipt-row receipt-amount">₱${state.amount.toLocaleString()}</div>
        <div class="receipt-row receipt-note">Pay at the venue · ${formatDate(state.bookingDate)}</div>
      </div>

      <!-- Action buttons -->
      <div class="success-actions">
        <button class="btn btn-ghost" onclick="window.print()">🖨 Print Receipt</button>
        <button class="btn btn-primary" data-action="reset">Book Another Session</button>
      </div>
    </div>
  `;
}

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  ADMIN PANEL
// ╚══════════════════════════════════════════════════════════════════════════════

// Full admin panel overlay (slide-up sheet from bottom)
function buildAdminPanel() {
  return `
    <div class="admin-overlay" id="adminOverlay">
      <div class="admin-panel">
        <div class="admin-header">
          <h2>Admin <span>Dashboard</span></h2>
          <button class="close-btn" data-action="closeAdmin" title="Close admin panel">✕</button>
        </div>

        <!-- Show login form or dashboard depending on auth state -->
        ${state.adminLoggedIn ? buildAdminDashboard() : buildAdminLogin()}
      </div>
    </div>
  `;
}

// ── Admin login form ──────────────────────────────────────────────────────────
// Simple password gate. Enter presses the login button via keydown listener.
function buildAdminLogin() {
  return `
    <div class="admin-login">
      <div class="admin-login-icon">🔐</div>
      <h3>Staff Access</h3>
      <p class="admin-login-hint">Enter your admin password to continue</p>

      <div class="form-group">
        <label for="adminPassInput">Password</label>
        <input type="password" id="adminPassInput"
               placeholder="••••••••••"
               autocomplete="current-password" />
      </div>

      <button class="btn btn-primary" data-action="adminLogin" style="width:100%;justify-content:center">
        Sign In →
      </button>
    </div>
  `;
}

// ── Admin dashboard ───────────────────────────────────────────────────────────
// Shows stats, date filter, tab switcher (List / Revenue Summary), and the
// bookings table with Confirm / Cancel actions per row.
function buildAdminDashboard() {
  const bookings   = state.adminBookings;
  const pending    = bookings.filter(b => b.status === "pending").length;
  const confirmed  = bookings.filter(b => b.status === "confirmed").length;
  const cancelled  = bookings.filter(b => b.status === "cancelled").length;
  // Revenue = sum of confirmed bookings only
  const revenue    = bookings
    .filter(b => b.status === "confirmed")
    .reduce((s, b) => s + (b.amount || 0), 0);

  return `
    <!-- ── Stats row ── -->
    <div class="stats-row">
      <div class="stat-box">
        <span class="stat-num">${bookings.length}</span>
        <span class="stat-label">Total</span>
      </div>
      <div class="stat-box pending">
        <span class="stat-num">${pending}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat-box confirmed">
        <span class="stat-num">${confirmed}</span>
        <span class="stat-label">Confirmed</span>
      </div>
      <div class="stat-box revenue">
        <span class="stat-num">₱${revenue.toLocaleString()}</span>
        <span class="stat-label">Revenue</span>
      </div>
    </div>

    <!-- ── Filter bar ── -->
    <div class="admin-filters">
      <!-- Date filter -->
      <input type="date" id="adminDateFilter"
             value="${esc(state.adminFilter)}"
             title="Filter bookings by date" />
      <button class="btn btn-ghost btn-sm" data-action="adminFilterDate">Filter</button>
      <button class="btn btn-ghost btn-sm" data-action="adminLoadAll">All</button>

      <!-- Export to CSV -->
      <button class="btn btn-ghost btn-sm" data-action="exportCSV" title="Download bookings as CSV">
        ⬇ Export CSV
      </button>

      <!-- Loading indicator -->
      ${state.adminLoading ? `<span class="spinner"></span>` : ""}

      <!-- Logout -->
      <button class="btn btn-ghost btn-sm logout-btn" data-action="adminLogout">Log out</button>
    </div>

    <!-- ── Tab switcher ── -->
    <div class="admin-tabs">
      <button class="admin-tab ${state.adminTab === "list" ? "active" : ""}"
              data-action="adminTabList">Booking List</button>
      <button class="admin-tab ${state.adminTab === "summary" ? "active" : ""}"
              data-action="adminTabSummary">Revenue Summary</button>
    </div>

    <!-- ── Tab content ── -->
    ${state.adminTab === "list"    ? buildAdminList(bookings)    : ""}
    ${state.adminTab === "summary" ? buildAdminSummary(bookings) : ""}
  `;
}

// ── Booking list table ────────────────────────────────────────────────────────
// Shows all fetched bookings with Confirm and Cancel action buttons.
function buildAdminList(bookings) {
  if (bookings.length === 0) {
    return `
      <div class="empty-state">
        <div style="font-size:3rem">📋</div>
        <p>No bookings found${state.adminFilter ? ` for ${formatDate(state.adminFilter)}` : ""}.</p>
      </div>
    `;
  }

  return `
    <div style="overflow-x:auto">
      <table class="bookings-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Name & Contact</th>
            <th>Type</th>
            <th>Duration</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => buildBookingRow(b)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// One row in the bookings table
function buildBookingRow(b) {
  return `
    <tr>
      <!-- Booking date -->
      <td class="td-date">${formatDate(b.booking_date)}</td>

      <!-- Customer name + optional contact info -->
      <td>
        <strong>${esc(b.name)}</strong>
        ${b.email ? `<br><small class="contact-info">${esc(b.email)}</small>` : ""}
        ${b.phone ? `<br><small class="contact-info">${esc(b.phone)}</small>` : ""}
        ${b.notes ? `<br><small class="note-info" title="${esc(b.notes)}">📝 ${esc(b.notes.slice(0,30))}${b.notes.length > 30 ? "…" : ""}</small>` : ""}
      </td>

      <!-- Booking type + customer type -->
      <td>
        <span class="type-chip">${typeEmoji(b.booking_type)} ${TYPE_LABELS[b.booking_type] || b.booking_type}</span>
        <br><small class="contact-info">${CUST_LABELS[b.customer_type] || b.customer_type}</small>
      </td>

      <!-- Duration -->
      <td>${esc(b.duration)}</td>

      <!-- Amount -->
      <td><strong>₱${(b.amount || 0).toLocaleString()}</strong></td>

      <!-- Status badge -->
      <td><span class="status-badge status-${b.status}">${b.status}</span></td>

      <!-- Action buttons — depend on current status -->
      <td class="td-actions">
        ${b.status === "pending" ? `
          <!-- Confirm: marks customer as having arrived -->
          <button class="action-btn confirm-btn"
                  data-action="confirmBooking" data-id="${b.$id}"
                  title="Mark as confirmed">✓</button>
          <!-- Cancel: marks booking as cancelled -->
          <button class="action-btn cancel-btn"
                  data-action="cancelBooking" data-id="${b.$id}"
                  title="Cancel this booking">✕</button>
        ` : b.status === "confirmed" ? `
          <!-- Allow un-cancelling a confirmed booking -->
          <button class="action-btn cancel-btn"
                  data-action="cancelBooking" data-id="${b.$id}"
                  title="Cancel this booking">Cancel</button>
        ` : `
          <!-- Cancelled — allow re-confirming if it was a mistake -->
          <button class="action-btn restore-btn"
                  data-action="confirmBooking" data-id="${b.$id}"
                  title="Restore this booking">Restore</button>
        `}
      </td>
    </tr>
  `;
}

// ── Revenue summary tab ────────────────────────────────────────────────────────
// Breaks down revenue by booking type so you can see what's most popular.
function buildAdminSummary(bookings) {
  if (bookings.length === 0) {
    return `<div class="empty-state"><p>No data to summarize.</p></div>`;
  }

  // Group confirmed bookings by type
  const types = ["coworking", "conference", "membership"];
  const rows  = types.map(t => {
    const group = bookings.filter(b => b.booking_type === t && b.status === "confirmed");
    const total = group.reduce((s, b) => s + (b.amount || 0), 0);
    return { type: t, count: group.length, total };
  });

  // Overall totals
  const totalCount    = bookings.filter(b => b.status === "confirmed").length;
  const totalRevenue  = rows.reduce((s, r) => s + r.total, 0);
  const pendingCount  = bookings.filter(b => b.status === "pending").length;
  const pendingAmount = bookings
    .filter(b => b.status === "pending")
    .reduce((s, b) => s + (b.amount || 0), 0);

  return `
    <div class="summary-tab">
      <h4 class="summary-tab-title">Confirmed Revenue by Space Type</h4>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Space Type</th>
            <th>Sessions</th>
            <th>Revenue (₱)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${typeEmoji(r.type)} ${TYPE_LABELS[r.type]}</td>
              <td>${r.count}</td>
              <td><strong>₱${r.total.toLocaleString()}</strong></td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr class="summary-total-row">
            <td><strong>Total Confirmed</strong></td>
            <td><strong>${totalCount}</strong></td>
            <td><strong>₱${totalRevenue.toLocaleString()}</strong></td>
          </tr>
          <tr class="summary-pending-row">
            <td>Pending (not yet confirmed)</td>
            <td>${pendingCount}</td>
            <td>₱${pendingAmount.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Breakdown by customer type -->
      <h4 class="summary-tab-title" style="margin-top:1.5rem">Breakdown by Customer Type</h4>
      <table class="summary-table">
        <thead><tr><th>Type</th><th>Sessions</th><th>Revenue (₱)</th></tr></thead>
        <tbody>
          ${["regular","student"].map(ct => {
            const g = bookings.filter(b => b.customer_type === ct && b.status === "confirmed");
            const t = g.reduce((s,b) => s + (b.amount||0), 0);
            return `<tr>
              <td>${CUST_LABELS[ct]}</td>
              <td>${g.length}</td>
              <td><strong>₱${t.toLocaleString()}</strong></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  5. EVENT LISTENERS
// ║  One delegated click listener covers all buttons in the entire app.
// ║  Enter key in admin password input also triggers login.
// ╚══════════════════════════════════════════════════════════════════════════════

function attachListeners() {
  // ── Click delegation ─────────────────────────────────────────────────────
  // Walk up from the clicked element to find the nearest [data-action] element.
  // This lets buttons contain icons/spans and still be detected correctly.
  root.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    await handleAction(el.dataset.action, el);
  });

  // ── Admin overlay backdrop click ─────────────────────────────────────────
  // Clicking the dark background behind the panel closes it.
  const overlay = document.getElementById("adminOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeAdmin();
    });
  }

  // ── Enter key in admin password field ────────────────────────────────────
  const passInput = document.getElementById("adminPassInput");
  if (passInput) {
    passInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") await handleAction("adminLogin", passInput);
    });
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  6. ACTION HANDLER
// ║  All user interactions are handled here.
// ║  To add a new action: add a new case at the bottom and wire it via
// ║  data-action="yourNewAction" on any HTML element.
// ╚══════════════════════════════════════════════════════════════════════════════

async function handleAction(action, el) {
  switch (action) {

    // ── Booking wizard: Step 1 ─────────────────────────────────────────────
    case "setType": {
      // Set booking type and reset downstream selections
      state.bookingType  = el.dataset.val;
      state.customerType = null;
      state.duration     = null;
      state.amount       = 0;
      render();
      break;
    }

    // ── Booking wizard: Step 2 ─────────────────────────────────────────────
    case "setCust": {
      // Set customer type and reset duration (price may differ)
      state.customerType = el.dataset.val;
      state.duration     = null;
      state.amount       = 0;
      render();
      break;
    }

    case "setDuration": {
      // Set duration and look up the price from pricing.js
      state.duration = el.dataset.val;
      const priceInfo = getPrice(state.bookingType, state.customerType, state.duration);
      state.amount = priceInfo?.price || 0;
      render();
      break;
    }

    // ── Step navigation ────────────────────────────────────────────────────
    case "toStep1": { state.step = 1; render(); scrollToTop(); break; }
    case "toStep2": { state.step = 2; render(); scrollToTop(); break; }
    case "toStep3": { state.step = 3; render(); scrollToTop(); break; }

    // ── Step 3 → 4: validate form before proceeding ────────────────────────
    case "saveDetails": {
      // Read values from the DOM
      const name  = document.getElementById("inp-name")?.value.trim();
      const date  = document.getElementById("inp-date")?.value;

      // Validate required fields
      if (!name) { showToast("Please enter your name", "error"); return; }
      if (!date) { showToast("Please select a booking date", "error"); return; }

      // Save all form fields into state
      state.name        = name;
      state.email       = document.getElementById("inp-email")?.value.trim()   || "";
      state.phone       = document.getElementById("inp-phone")?.value.trim()   || "";
      state.address     = document.getElementById("inp-address")?.value.trim() || "";
      state.bookingDate = date;
      state.notes       = document.getElementById("inp-notes")?.value.trim()   || "";

      state.step = 4;
      render();
      scrollToTop();
      break;
    }

    // ── Step 4 → Submit booking to Appwrite ────────────────────────────────
    case "submitBooking": {
      state.submitting = true;
      render(); // Show spinner on button

      try {
        const doc = await createBooking({
          name:        state.name,
          email:       state.email,
          phone:       state.phone,
          address:     state.address,
          bookingDate: state.bookingDate,
          bookingType: state.bookingType,
          customerType: state.customerType,
          duration:    state.duration,
          amount:      state.amount,
          notes:       state.notes,
        });

        // Success — store the ID, advance to success screen
        state.lastBookingId = doc.$id;
        state.step          = 5;
        state.submitting    = false;
        render();
        scrollToTop();
      } catch (err) {
        // Failure — show error toast and reset the button
        state.submitting = false;
        render();
        showToast(
          "Booking failed: " + (err.message || "Unknown error. Check Appwrite setup."),
          "error"
        );
        console.error("[rSpace] Booking error:", err);
      }
      break;
    }

    // ── Reset: start a new booking ─────────────────────────────────────────
    case "reset": {
      // Clear all booking-related state (keep admin state intact)
      Object.assign(state, {
        step:         1,
        bookingType:  null,
        customerType: null,
        duration:     null,
        amount:       0,
        name:         "",
        email:        "",
        phone:        "",
        address:      "",
        bookingDate:  "",
        notes:        "",
        submitting:   false,
        lastBookingId: null,
      });
      render();
      scrollToTop();
      break;
    }

    // ── Admin: open/close toggle ───────────────────────────────────────────
    case "adminToggle": {
      state.adminOpen = !state.adminOpen;
      // Auto-load bookings when opening if already logged in
      if (state.adminOpen && state.adminLoggedIn) {
        await loadAllBookings();
      }
      render();
      break;
    }

    case "closeAdmin": {
      closeAdmin();
      break;
    }

    // ── Admin: login ───────────────────────────────────────────────────────
    case "adminLogin": {
      const passInput = document.getElementById("adminPassInput");
      const entered   = passInput?.value || "";

      if (entered === ADMIN_PASSWORD) {
        state.adminLoggedIn = true;
        state.adminPass     = "";
        await loadAllBookings();
        render();
        showToast("Welcome back, Admin!", "success");
      } else {
        showToast("Incorrect password", "error");
        // Shake the input to give visual feedback
        passInput?.classList.add("shake");
        setTimeout(() => passInput?.classList.remove("shake"), 500);
      }
      break;
    }

    // ── Admin: logout ──────────────────────────────────────────────────────
    case "adminLogout": {
      state.adminLoggedIn = false;
      state.adminBookings = [];
      state.adminFilter   = "";
      state.adminTab      = "list";
      render();
      break;
    }

    // ── Admin: filter by date ──────────────────────────────────────────────
    case "adminFilterDate": {
      const dateInp = document.getElementById("adminDateFilter");
      state.adminFilter   = dateInp?.value || "";
      state.adminLoading  = true;
      render(); // Show spinner

      try {
        state.adminBookings = state.adminFilter
          ? await getBookingsByDate(state.adminFilter)
          : await getAllBookings();
      } catch (e) {
        showToast("Failed to load bookings", "error");
        console.error("[rSpace] Admin fetch error:", e);
      }

      state.adminLoading = false;
      render();
      break;
    }

    // ── Admin: show all bookings (clear date filter) ───────────────────────
    case "adminLoadAll": {
      state.adminFilter = "";
      await loadAllBookings();
      render();
      break;
    }

    // ── Admin: tab switcher ────────────────────────────────────────────────
    case "adminTabList":    { state.adminTab = "list";    render(); break; }
    case "adminTabSummary": { state.adminTab = "summary"; render(); break; }

    // ── Admin: confirm a booking ───────────────────────────────────────────
    case "confirmBooking": {
      const id = el.dataset.id;
      try {
        await updateBookingStatus(id, "confirmed");
        showToast("Booking confirmed ✓", "success");
        await loadAllBookings(); // Refresh table
        render();
      } catch (err) {
        showToast("Could not confirm booking", "error");
        console.error("[rSpace] Confirm error:", err);
      }
      break;
    }

    // ── Admin: cancel a booking ────────────────────────────────────────────
    case "cancelBooking": {
      const id = el.dataset.id;
      // Simple inline confirm — replace with a modal if desired
      if (!confirm("Cancel this booking? The customer will not be notified automatically.")) break;
      try {
        await updateBookingStatus(id, "cancelled");
        showToast("Booking cancelled", "");
        await loadAllBookings();
        render();
      } catch (err) {
        showToast("Could not cancel booking", "error");
        console.error("[rSpace] Cancel error:", err);
      }
      break;
    }

    // ── Admin: export bookings to CSV ──────────────────────────────────────
    case "exportCSV": {
      exportToCSV(state.adminBookings);
      break;
    }

    // Unknown action — log in dev, silently ignore in prod
    default: {
      console.warn("[rSpace] Unknown action:", action);
    }
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  7. ADMIN HELPERS
// ╚══════════════════════════════════════════════════════════════════════════════

// Fetches all bookings from Appwrite and stores them in state.adminBookings.
// Shows a loading spinner while the request is in-flight.
async function loadAllBookings() {
  state.adminLoading = true;
  try {
    state.adminBookings = await getAllBookings();
  } catch (e) {
    state.adminBookings = [];
    showToast("Could not load bookings — check Appwrite permissions", "error");
    console.error("[rSpace] Load error:", e);
  }
  state.adminLoading = false;
}

// Closes the admin panel without logging out (state is preserved).
function closeAdmin() {
  state.adminOpen = false;
  render();
}

// Converts the current booking list to a CSV file and triggers a download.
// Columns can be added/removed by editing the `headers` array and the row mapper.
function exportToCSV(bookings) {
  if (bookings.length === 0) {
    showToast("No bookings to export", "");
    return;
  }

  // CSV column headers — change order or add columns here
  const headers = [
    "Date", "Name", "Email", "Phone", "Address",
    "Type", "Customer", "Duration", "Amount (₱)", "Status", "Notes", "Created At"
  ];

  // Map each booking document to a CSV row
  const rows = bookings.map(b => [
    b.booking_date,
    b.name,
    b.email       || "",
    b.phone       || "",
    b.address     || "",
    TYPE_LABELS[b.booking_type]  || b.booking_type,
    CUST_LABELS[b.customer_type] || b.customer_type,
    b.duration,
    b.amount,
    b.status,
    (b.notes || "").replace(/,/g, ";"), // Escape commas in notes
    b.created_at,
  ]);

  // Build CSV string
  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  // Trigger browser download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `rspace-bookings-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`Exported ${bookings.length} bookings`, "success");
}

// ╔══════════════════════════════════════════════════════════════════════════════
// ║  8. UTILITY HELPERS
// ╚══════════════════════════════════════════════════════════════════════════════

// Escapes a string for safe insertion into HTML innerHTML.
// ALWAYS use this on user-supplied data to prevent XSS.
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Formats a YYYY-MM-DD date string to a long Filipino-style date.
// e.g. "2025-06-15" → "June 15, 2025"
// Change the locale string to adjust the format.
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    // Add T00:00:00 to avoid timezone-shifting the date
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-PH", {
      year:  "numeric",
      month: "long",
      day:   "numeric",
    });
  } catch {
    return dateStr; // Fallback to raw string if parsing fails
  }
}

// Returns an emoji for a given booking type (used in admin table).
// Add new types here if you expand BOOKING_TYPES.
function typeEmoji(type) {
  return { coworking: "💻", conference: "🏛️", membership: "🌟" }[type] || "📋";
}

// Shows a temporary toast notification at the bottom of the screen.
// type: "" | "success" | "error"
// Duration: 3.5 seconds. Change the setTimeout value to adjust.
function showToast(msg, type = "") {
  // Remove any existing toast first so they don't stack
  document.querySelector(".toast")?.remove();

  const t = document.createElement("div");
  t.className   = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);

  setTimeout(() => t.remove(), 3500);
}

// Scrolls the page back to the top — called when navigating between steps.
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
