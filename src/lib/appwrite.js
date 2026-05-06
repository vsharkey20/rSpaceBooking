// src/lib/appwrite.js
// ─────────────────────────────────────────────────────────────────────────────
// Appwrite SDK initialization and configuration.
//
// HOW TO CUSTOMIZE:
//   • Change APPWRITE_ENDPOINT if you switch regions (fra = Frankfurt)
//   • Change APPWRITE_PROJECT_ID to point to a different Appwrite project
//   • Change DATABASE_ID if you create a new database in your Appwrite console
//   • Change COLLECTIONS.BOOKINGS if you rename the collection in Appwrite
//
// APPWRITE CONSOLE SETUP (one-time):
//   1. Go to https://cloud.appwrite.io → your project → Databases
//   2. Open database ID: 69fb5c5f00396d0e7587
//   3. Create a collection called "bookings"
//   4. Add these attributes to the collection:
//        name          → String,  required, size: 100
//        address       → String,  optional, size: 255
//        email         → String,  optional, size: 100
//        phone         → String,  optional, size: 30
//        booking_date  → String,  required, size: 20   (YYYY-MM-DD)
//        booking_type  → String,  required, size: 20   (coworking|conference|membership)
//        customer_type → String,  required, size: 20   (regular|student)
//        duration      → String,  required, size: 20   (1hr|4hrs|8hrs|12hrs|monthly)
//        amount        → Integer, required
//        notes         → String,  optional, size: 500
//        status        → String,  required, size: 20   (pending|confirmed|cancelled)
//        created_at    → String,  required, size: 40
//   5. In Permissions → add "Any" role with Create + Read access
//      (so guests can book and the admin panel can read all records)
// ─────────────────────────────────────────────────────────────────────────────

import { Client, Account, Databases } from "appwrite";

// ── Appwrite project credentials ──────────────────────────────────────────────
// Safe to be public in a frontend. These identify your project, not a secret key.
const APPWRITE_ENDPOINT   = "https://fra.cloud.appwrite.io/v1"; // Change region if needed
const APPWRITE_PROJECT_ID = "69fb5c1000120dc6fb06";             // Your Appwrite project ID

// ── Appwrite client ───────────────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// ── Service instances ─────────────────────────────────────────────────────────
const account   = new Account(client);    // For future Appwrite Auth integration
const databases = new Databases(client);  // Used for all booking CRUD operations

// ── Database & Collection IDs ─────────────────────────────────────────────────
// Keep these in sync with what you created in Appwrite Console.
export const DATABASE_ID = "69fb5c5f00396d0e7587"; // Your database ID

export const COLLECTIONS = {
  BOOKINGS: "bookings", // The collection name — change if you rename it in Appwrite
};

export { client, account, databases };
