# LedgerTurf Production-Style MERN SaaS Overview

LedgerTurf has been architected as a high-control, production-ready MERN application. Below is a detailed overview of the system architecture, advanced features, and deployment workflows.

## 🔐 Advanced Authentication & Security

- **Safe Defaults**: Browser autofill and autocomplete are disabled for sensitive fields (Email, Phone, Password) to prevent credential caching on public terminals.
- **UX Helpers**: Integrated a "Show Password" visibility toggle in the global `FormInput` component.
- **RBAC**: Strictly enforced Role-Based Access Control for Players, Turf Owners, and SuperAdmins.

## ⚽ Dhaka-Based Ecosystem & Seeder

The system features a realistic dataset of **25 venues** across 10 Dhaka areas (Uttara, Gulshan, Banani, etc.).
- **High Fidelity**: Every turf includes unique, high-quality sports imagery and precise Dhaka coordinates.
- **Operating Hours**: Varied schedules including premium **Late Night** facilities open until 6:00 AM.
- **Seeder Automation**: `node seeder.js` performs a clean wipe and atomic insertion of the entire Dhaka ecosystem.

## 🗺️ Precision Google Maps Integration

- **For Owners**: A draggable pin picker in the registration flow allows precise GeoJSON location marking.
- **For Players**: Detail pages feature interactive maps and one-click redirection to Google Maps for turn-by-turn directions.
- **For Admins**: The approval queue includes a map preview to verify the facility's location before authorizing.

## 📅 Robust Booking & Time Validation

- **BD Time Sync**: All slot availability and validations are synchronized with **Bangladesh Time (UTC+6)**, ensuring past slots are automatically disabled.
- **Visual Validation**: Unavailable slots are styled with high-contrast error states (red backgrounds and not-allowed cursors).
- **Concurrency**: Backend checks prevent overlapping bookings for the same turf/date/time.

## 📈 Dashboard Architecture

- **SuperAdmin**: Fully route-based oversight center. Manage approval queues, moderate users, and monitor platform-wide revenue and athlete growth.
- **Turf Owner**: Dedicated business hub. Track per-venue earnings, manage reservations, and list new facilities with precision maps and imagery.
- **Unified Navigation**: Centralized sidebar navigation replaces legacy tab switchers for a cleaner, focused UX.

## ☁️ Vercel Deployment Workflow

LedgerTurf uses a **monorepo-style deployment** on Vercel:
1.  **Architecture**: The backend Express app is exported as a Vercel Serverless Function via `api/index.js`.
2.  **Routing**: `vercel.json` rewrites all `/api` calls to the serverless layer and serves the Vite React app as a catch-all for SPA routing.
3.  **Efficiency**: Connection pooling in `backend/src/config/db.js` ensures efficient MongoDB connection reuse across serverless cold starts.

### Deployment Quick-Start
1.  Connect your repo to Vercel.
2.  Set `MONGO_URI` and `JWT_SECRET`.
3.  Set `NODE_ENV` to `production`.
4.  Vercel handles the rest—installing, building, and deploying both layers simultaneously.
