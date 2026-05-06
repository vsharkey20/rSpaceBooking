// src/lib/bookingService.js
// ─────────────────────────────────────────────────────────────────────────────
// All Appwrite database operations for bookings.
//
// Each function here wraps an Appwrite SDK call.
// Errors are NOT caught here — they bubble up to the caller (app.js)
// so the UI can show appropriate messages.
//
// HOW TO ADD A NEW FIELD:
//   1. Add the attribute in Appwrite Console (Database → Collection → Attributes)
//   2. Add it to the document object inside `createBooking()` below
//   3. Reference it in app.js where you build the form / summary / table
// ─────────────────────────────────────────────────────────────────────────────

import { databases, DATABASE_ID, COLLECTIONS } from "./appwrite.js";
import { ID, Query } from "appwrite";

// ── createBooking ─────────────────────────────────────────────────────────────
// Saves a new booking record to Appwrite.
// `data` should match the fields defined in appwrite.js (Setup section).
// Returns the created document (including its $id for the reference number).
export async function createBooking(data) {
  return await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.BOOKINGS,
    ID.unique(), // Appwrite generates a unique ID automatically
    {
      name:          data.name,
      address:       data.address      || "", // Optional — store empty string if not provided
      email:         data.email        || "",
      phone:         data.phone        || "",
      booking_date:  data.bookingDate,         // YYYY-MM-DD string
      booking_type:  data.bookingType,         // "coworking" | "conference" | "membership"
      customer_type: data.customerType,        // "regular" | "student"
      duration:      data.duration,            // "1hr" | "4hrs" | "8hrs" | "12hrs" | "monthly"
      amount:        data.amount,              // Integer — total price in PHP
      notes:         data.notes        || "",
      status:        "pending",                // All new bookings start as pending
      $createdAt:    new Date().toISOString(), // ISO datetime for sorting
    }
  );
}

// ── getAllBookings ─────────────────────────────────────────────────────────────
// Fetches all bookings, sorted newest booking_date first.
// Used by the admin dashboard when no date filter is active.
// Limit is set to 500 — increase if you expect very high volume.
export async function getAllBookings() {
  const res = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.BOOKINGS,
    [
      Query.orderDesc("booking_date"), // Most recent dates first
      Query.limit(500),                // Increase if needed for high volume
    ]
  );
  return res.documents;
}

// ── getBookingsByDate ─────────────────────────────────────────────────────────
// Fetches bookings for a specific date (YYYY-MM-DD string).
// Used by the admin date filter.
export async function getBookingsByDate(date) {
  const res = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.BOOKINGS,
    [
      Query.equal("booking_date", date), // Match exact date string
      Query.orderAsc("created_at"),      // Earliest created first within that day
    ]
  );
  return res.documents;
}

// ── updateBookingStatus ───────────────────────────────────────────────────────
// Updates the `status` field of a booking.
// Valid values: "pending" | "confirmed" | "cancelled"
// Called from the admin dashboard when staff clicks Confirm or Cancel.
export async function updateBookingStatus(id, status) {
  return await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.BOOKINGS,
    id,
    { status }
  );
}
