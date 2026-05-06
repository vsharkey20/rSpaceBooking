// src/lib/pricing.js
// ─────────────────────────────────────────────────────────────────────────────
// All pricing data for rSpace Coworking.
//
// HOW TO CUSTOMIZE PRICES:
//   • Find the booking type and customer type you want to change.
//   • Update the `price` field. All amounts are in Philippine Peso (₱).
//   • The `label` is shown on the rate card button.
//   • The `desc` is an optional note shown below the price (e.g., "per session").
//
// HOW TO ADD A NEW DURATION:
//   • Add a new key (e.g. "2hrs") inside the relevant customer type object.
//   • The key is used internally; label is what the user sees.
//
// HOW TO ADD A NEW BOOKING TYPE:
//   • Add a new top-level key (e.g. "podcast") to PRICING.
//   • Add it to BOOKING_TYPES in app.js so it appears as a card.
//   • It must have both "regular" and "student" sub-objects.
//
// HOW TO ADD A NEW MEMBERSHIP TIER:
//   • Add another key inside PRICING.membership.regular (and/or .student).
//   • Give it a unique key, label, price, and desc.
// ─────────────────────────────────────────────────────────────────────────────

export const PRICING = {

  // ── Coworking (hot desk / open space) ──────────────────────────────────────
  coworking: {
    regular: {
      "1hr":   { label: "1 Hour",   price: 85  },
      "4hrs":  { label: "4 Hours",  price: 250 },
      "8hrs":  { label: "8 Hours",  price: 450 },
      "12hrs": { label: "12 Hours", price: 680 },
    },
    student: {
      "1hr":   { label: "1 Hour",   price: 79  },
      "4hrs":  { label: "4 Hours",  price: 225 },
      "8hrs":  { label: "8 Hours",  price: 405 },
      "12hrs": { label: "12 Hours", price: 612 },
    },
  },

  // ── Conference Room ─────────────────────────────────────────────────────────
  // Same rate for regular and student (no discount for conference rooms).
  // To add a student discount, simply change the prices in the student block.
  conference: {
    regular: {
      "1hr":   { label: "1 Hour",   price: 650  },
      "4hrs":  { label: "4 Hours",  price: 2000 },
      "8hrs":  { label: "8 Hours",  price: 3000 },
      "12hrs": { label: "12 Hours", price: 4000 },
    },
    student: {
      // Conference room rate is the same regardless of customer type.
      // Update these if a student discount is added in the future.
      "1hr":   { label: "1 Hour",   price: 650  },
      "4hrs":  { label: "4 Hours",  price: 2000 },
      "8hrs":  { label: "8 Hours",  price: 3000 },
      "12hrs": { label: "12 Hours", price: 4000 },
    },
  },

  // ── Membership Plans ────────────────────────────────────────────────────────
  // The `desc` field shows under the price on the rate card (e.g., plan details).
  // The `monthly` key maps to the duration stored in Appwrite ("monthly").
  membership: {
    regular: {
      monthly: {
        label: "Monthly Standard",
        price: 2999,
        desc:  "Unlimited Hours / day",
      },
      // Example: add an annual plan here
      // annual: { label: "Annual Standard", price: 29999, desc: "Best value — save ₱5,989" },
    },
    student: {
      monthly: {
        label: "Student Monthly",
        price: 2999,
        desc:  "Unlimited Hours / day · Valid ID required",
      },
    },
  },
};

// ── Helper: get a single pricing entry ────────────────────────────────────────
// Returns the { label, price, desc? } object or null if not found.
// Used throughout the app to get the price for a given selection.
export function getPrice(bookingType, customerType, duration) {
  return PRICING[bookingType]?.[customerType]?.[duration] || null;
}

// ── Helper: human-readable labels ─────────────────────────────────────────────
// Used in the summary box and admin table to display friendly names.
export const TYPE_LABELS = {
  coworking:  "Coworking Space",
  conference: "Conference Room",
  membership: "Membership",
};

export const CUST_LABELS = {
  regular: "Regular",
  student: "Student",
};
