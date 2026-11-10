import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession, verifyCsrfProtection } from '@/lib/auth/session';
import {
  appendServerActivityLog,
  forwardMutationToAppsScript,
  loadServerRefundState,
  persistServerRefundState,
  SEED_THUMB_BY_ORDER,
  SEED_THUMB_BY_ROW
} from '@/lib/server/refund-store';
import { formatDdMmmYyyy, recomputeFormulaColumns } from '@/lib/utils/refund-math';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ============================================================================
 * PROTECTED SCREENSHOT UPLOAD ROUTE (/api/screenshots)
 * - Restricted to authenticated Super Administrator sessions with valid CSRF token.
 * - Validates image data URL format & size before storing and forwarding to
 *   Google Apps Script / Drive (`Refund Screenshots / 2026 / <Month> / <OrderID>`).
 * ============================================================================
 */

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedSession(req);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: Valid Super Administrator session required to upload screenshots.' },
      { status: 401 }
    );
  }
  if (session.mustChangePassword) {
    return NextResponse.json(
      { error: 'Mandatory password change required before uploading screenshots.' },
      { status: 403 }
    );
  }

  const csrf = verifyCsrfProtection(req, session);
  if (!csrf.valid) {
    return NextResponse.json(
      { error: csrf.reason || 'CSRF validation failed.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const orderId = String(body.orderId || body.record?.orderId || '').trim();
    const screenshotThumb = String(body.screenshotThumb || body.record?.screenshotThumb || '').trim();
    const referenceId = String(body.referenceId || body.record?.referenceId || '').trim();
    const fileName = String(body.fileName || `${orderId}_proof.jpg`).trim();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required for screenshot attachment.' },
        { status: 400 }
      );
    }

    if (
      !screenshotThumb ||
      (!screenshotThumb.startsWith('data:image/') && !screenshotThumb.startsWith('https://'))
    ) {
      return NextResponse.json(
        { error: 'Valid JPG, PNG, or WebP image payload is required.' },
        { status: 400 }
      );
    }

    // Prevent oversized payload (> 6 MB base64 string)
    if (screenshotThumb.length > 6 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Screenshot payload exceeds maximum 6 MB limit.' },
        { status: 413 }
      );
    }

    const state = loadServerRefundState();
    const idx = state.records.findIndex(
      r => r.orderId.toLowerCase() === orderId.toLowerCase()
    );
    if (idx === -1) {
      return NextResponse.json(
        { error: `Order ID ${orderId} not found in MASTER REFUND DATA.` },
        { status: 404 }
      );
    }

    const existing = state.records[idx];
    const oidKey = existing.orderId.trim().toUpperCase();
    state.uploadedScreenshots[oidKey] = screenshotThumb;

    const prevTrail = existing.screenshotThumb
      ? [...(existing.previousScreenshots || []), existing.screenshotThumb]
      : existing.previousScreenshots || [];

    const todayDisplay = formatDdMmmYyyy(new Date().toISOString().slice(0, 10));
    const updated = recomputeFormulaColumns(
      {
        ...existing,
        screenshotThumb,
        referenceId: referenceId || existing.referenceId,
        screenshotDate: todayDisplay,
        lastUpdated: todayDisplay,
        previousScreenshots: prevTrail
      },
      true,
      {
        byOrder: { ...SEED_THUMB_BY_ORDER, ...state.uploadedScreenshots },
        byRow: SEED_THUMB_BY_ROW
      }
    );

    state.records[idx] = updated;

    const logEntry = appendServerActivityLog(state, {
      operator: `${session.username} (${session.email})`,
      rowNumber: updated.rowNumber,
      orderId: updated.orderId,
      fieldChanged: 'Refund Screenshot (SS)',
      oldValue: existing.proofStatus,
      newValue: `Uploaded HD Proof (${fileName}) • Proof Status -> Available`,
      changeType: 'Screenshot Upload'
    });
    persistServerRefundState(state);

    const remoteRes = await forwardMutationToAppsScript(
      'uploadScreenshot',
      updated,
      session.email
    );

    return NextResponse.json({
      status: 'uploaded',
      orderId: updated.orderId,
      rowNumber: updated.rowNumber,
      record: updated,
      logEntry,
      remoteSync: remoteRes
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Screenshot upload failed' },
      { status: 500 }
    );
  }
}
