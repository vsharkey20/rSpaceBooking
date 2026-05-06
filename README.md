# rSpace Booking System

A clean, branded booking system for **rSpace Coworking Space**, built with Vite + Vanilla JavaScript + Appwrite.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
# → Opens at http://localhost:5173
```

---

## 🗄️ Appwrite Setup (one-time)

Before bookings will save, you need to create a collection in Appwrite.

### 1. Open your Appwrite Console
Go to: https://cloud.appwrite.io → Project **rSpaceBooking** → **Databases**

### 2. Open Database
Database ID: `69fb5c5f00396d0e7587`

### 3. Create Collection
- Name: `bookings`
- Collection ID: `bookings`

### 4. Add Attributes

| Attribute       | Type    | Required | Size |
|----------------|---------|----------|------|
| `name`          | String  | ✅       | 100  |
| `address`       | String  | ❌       | 255  |
| `email`         | String  | ❌       | 100  |
| `phone`         | String  | ❌       | 30   |
| `booking_date`  | String  | ✅       | 20   |
| `booking_type`  | String  | ✅       | 20   |
| `customer_type` | String  | ✅       | 20   |
| `duration`      | String  | ✅       | 20   |
| `amount`        | Integer | ✅       | —    |
| `notes`         | String  | ❌       | 500  |
| `status`        | String  | ✅       | 20   |
| `created_at`    | String  | ✅       | 40   |

### 5. Set Permissions
In the collection → **Settings** → **Permissions**:
- Add role: **Any** → enable **Create** and **Read**

---

## 📁 Project Structure

```
rspace-booking/
├── index.html              ← Entry HTML, fonts loaded here
├── vite.config.js          ← Vite dev/build settings
├── package.json
└── src/
    ├── main.js             ← Bootstraps app, pings Appwrite
    ├── app.js              ← All UI logic (state, render, actions)
    ├── lib/
    │   ├── appwrite.js     ← SDK init + IDs
    │   ├── bookingService.js ← Appwrite CRUD functions
    │   └── pricing.js      ← All prices + labels
    └── styles/
        └── main.css        ← All styles (CSS variables at top)
```

---

## 💰 Pricing

Edit `src/lib/pricing.js` to change any prices:

| Space         | Customer | 1hr  | 4hrs | 8hrs | 12hrs |
|--------------|----------|------|------|------|-------|
| Coworking     | Regular  | ₱85  | ₱250 | ₱450 | ₱680  |
| Coworking     | Student  | ₱79  | ₱225 | ₱405 | ₱612  |
| Conference    | Both     | ₱650 | ₱2,000 | ₱3,000 | ₱4,000 |
| Membership    | Both     | ₱2,999/month (Unlimited) | | | |

---

## 🔐 Admin Panel

- Click the subtle **⚙ Admin** button in the top-right corner
- Default password: `rSpace@2024`
- To change: update `ADMIN_PASSWORD` in `src/app.js`

### Admin Features
- View all bookings or filter by date
- **Confirm** a booking (customer showed up)
- **Cancel** a booking
- **Revenue Summary** tab — breakdown by space type and customer type
- **Export CSV** — download all bookings as a spreadsheet

---

## 🎨 Customization

### Change colors
Edit CSS variables in `src/styles/main.css`:
```css
:root {
  --yellow: #F5D800;   /* Main accent color */
  --black:  #111111;   /* Header, dark elements */
}
```

### Change prices
Edit `src/lib/pricing.js` — all rates are documented inline.

### Add a new space type
1. Add an entry to `BOOKING_TYPES` in `src/app.js`
2. Add pricing data in `src/lib/pricing.js`

### Change fonts
1. Update the Google Fonts `<link>` in `index.html`
2. Update `--font-display`, `--font-script`, `--font-body` in `main.css`

---

## 🏗️ Build for Production

```bash
npm run build
# Output in /dist — upload to any static host (Vercel, Netlify, etc.)
```

---

## 🔧 Tech Stack

- **Vite** — fast dev server + bundler
- **Vanilla JS** — no framework, simple state→render pattern
- **Appwrite** — backend database (cloud-hosted)
- **Google Fonts** — Playfair Display, Dancing Script, DM Sans
