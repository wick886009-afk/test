import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL || '';
const SECRET_TOKEN = process.env.GLEVA_ADMIN_BEARER_TOKEN || 'gleva-ops-2026-verified';

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({
      error: 'Set GOOGLE_APPS_SCRIPT_WEB_APP_URL in Vercel to enable remote Drive screenshot uploads.'
    }, { status: 400 });
  }
  try {
    const body = await req.json();
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        token: SECRET_TOKEN,
        action: 'uploadScreenshot',
        ...body
      })
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 });
  }
}
