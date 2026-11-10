# Gleva Refund Desk V2 — Live Refund Management System

## Quick Free Deployment Guide (Vercel)
1. Extract this ZIP archive so `package.json` is in the root of your project folder.
2. Push the files to a GitHub repository (or run `npx vercel` inside the extracted folder).
3. Import the repository on Vercel (Framework Preset: **Next.js**, Root Directory: `./`).
4. Click **Deploy** — it builds cleanly even before environment variables are added!
5. To connect live two-way Google Sheets sync for ₹0 (no Google Cloud Console required):
   - Open your Google Sheet -> **Extensions -> Apps Script**.
   - Paste `google-apps-script/Gleva_Refund_System_2026.gs` and click **Deploy -> New deployment -> Web app** (`Execute as: Me`, `Who has access: Anyone`).
   - Copy the `https://script.google.com/macros/s/.../exec` URL into the **Settings & Sync** tab of your deployed Gleva Refund Desk website!

## Mobile and live-date update

- Existing Gleva colours, sections, refund records, screenshots and Apps Script are retained.
- Mobile and tablet navigation uses a slide-out menu. Search, forms, filters, dialogs and scrollable tables adapt to smaller screens, with larger touch targets.
- The date and clock use Asia/Kolkata (IST). New case dates, processing dates and screenshot dates use today's date. Pending-day calculations refresh at midnight, and month/year choices extend automatically.
- Existing historical dates are preserved; missing dates are not replaced with invented dates.
- Live refresh polls the existing connection every 15 seconds while the tab is visible (adjustable in Settings). Returning to the tab or reconnecting triggers a refresh. This is polling, not instantaneous server push; the website does not run background sync while closed.
- The existing Vercel GOOGLE_APPS_SCRIPT_WEB_APP_URL setting is used automatically through /api/refunds. Saved connection settings remain supported. Successful live refresh requires an accessible, correctly configured existing Google Sheets / Apps Script connection.
- Sync status distinguishes refreshed data from a saved snapshot or a failed connection. Request timeouts and overlapping-read protection prevent a stalled request from permanently stopping refresh.

Validation: production build, TypeScript and date/formula regression checks. All original embedded records, screenshots and the Apps Script file were verified unchanged. Live Google Sheets writes were not performed. Browser visual QA was unavailable because the preview runner did not support this project's Next.js command-line options.
