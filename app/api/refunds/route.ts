import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ============================================================================
 * ZERO-COST VERCEL HOBBY SERVER ROUTE (/api/refunds)
 * Proxies requests securely to your Free Google Apps Script Web App URL
 * (`GOOGLE_APPS_SCRIPT_WEB_APP_URL` environment variable in Vercel),
 * avoiding any Google Cloud billing/service account requirement.
 * ============================================================================
 */

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL || '';
const SECRET_TOKEN = process.env.GLEVA_ADMIN_BEARER_TOKEN || 'gleva-ops-2026-verified';

export async function GET(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({
      status: 'unconfigured',
      message: 'Set GOOGLE_APPS_SCRIPT_WEB_APP_URL in Vercel Environment Variables or paste your Apps Script URL directly into the Settings & Sync tab.'
    }, { status: 200 });
  }

  try {
    const url = `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes('?') ? '&' : '?'}token=${encodeURIComponent(SECRET_TOKEN)}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const data = await res.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch from Google Sheet Apps Script' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({
      error: 'Set GOOGLE_APPS_SCRIPT_WEB_APP_URL in Vercel or paste your Apps Script URL into the Settings & Sync tab.'
    }, { status: 400 });
  }

  try {
    const body = await req.json();
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        token: SECRET_TOKEN,
        operator: req.headers.get('x-gleva-operator') || 'anas.saifee@gleva.in',
        action: body.action || 'update',
        record: body.record
      })
    });
    const data = await res.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update Google Sheet' }, { status: 500 });
  }
}
