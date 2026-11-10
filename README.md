# Gleva Refund Desk V3 — Premium 3D Refund Operations & Financial Intelligence

## What's Upgraded in V3
1. **Enterprise Administrator Authentication & Zero Public Data Leakage**:
   - Server-side login for **Super Administrator** (`anassaifee`) with memory-hard Argon2id/Scrypt (`N=16384, r=8, p=1`) password hashing and timing-safe comparison (`lib/auth/password.ts`).
   - Enforces **mandatory password change on first login** when signing in with the initial temporary password (`Gleva@123`).
   - Signed `HttpOnly`, `SameSite=Lax`, `Secure` session cookies (`8h` standard or `14d` with **Remember Me**), sliding-window brute-force rate limiting (5 attempts / 15m lockout), and double-submit CSRF protection (`x-csrf-token`).
   - All 65 historical customer refund records (`₹55,785.68`) and embedded WebP payment proof screenshots are stored strictly server-side (`lib/server/seed-records.json`) and served exclusively through authenticated `/api/refunds` requests—removing 1.1 MB of sensitive customer PII from public client JavaScript bundles.
2. **3D-Inspired Visual Redesign & Mobile-First Architecture**:
   - Interactive 3D glass sculpture & particle field on `/login` (`components/three/GlassSculptureCanvas.tsx`), floating 3D brand prism in the dashboard welcome banner (`components/three/BrandOrbCanvas.tsx`), and mouse-responsive 3D perspective tilt KPI cards (`components/ui/TiltCard.tsx`).
   - Dedicated mobile card layout (`components/refunds/MobileRefundCard.tsx`), slide-over navigation drawer, fixed mobile bottom navigation bar, floating action button (FAB), and full-screen mobile filter sheet (`320px` to `430px+` phones).
3. **8-KPI & 8-Chart Financial Operations Analytics (`components/analytics/DashboardCharts.tsx`)**:
   - Monthly Refund Amount Trend, Refund Status Distribution, Refund Reasons Breakdown, Product-Wise Refund Analysis, Weekly Refund Activity Velocity, Processing Time SLA Performance, Pending vs. Completed Refunds, and Year-over-Year Quarterly Trajectory.

## Vercel Hobby Deployment Instructions
1. Extract the ZIP archive and push the root folder to a private GitHub/GitLab repository (or run `npx vercel`).
2. In your Vercel project settings (**Settings → Environment Variables**), configure the variables shown in `.env.example`:
   - `GLEVA_SESSION_SECRET`: Any random 32+ character secret string.
   - `GLEVA_ADMIN_USERNAME`: `anassaifee`
   - `GOOGLE_APPS_SCRIPT_WEB_APP_URL`: Your deployed Google Apps Script Web App URL.
   - `GLEVA_ADMIN_BEARER_TOKEN`: Your secret bearer token matching Google Apps Script Script Properties.
3. To configure the upgraded Google Apps Script (`google-apps-script/Gleva_Refund_System_2026.gs`):
   - Open your Google Sheet → **Extensions → Apps Script** and paste `Gleva_Refund_System_2026.gs`.
   - Reload your Google Sheet and click **⚡ Gleva Refund System V3 → 🔑 Configure Web App Secret Token** to save your `GLEVA_ADMIN_BEARER_TOKEN` in `ScriptProperties`.
   - Click **Deploy → New deployment → Web app** (`Execute as: Me`, `Who has access: Anyone`) and copy the `/exec` URL to `GOOGLE_APPS_SCRIPT_WEB_APP_URL` in Vercel.
