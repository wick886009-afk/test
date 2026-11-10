import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession, verifyCsrfProtection } from '@/lib/auth/session';
import {
  appendServerActivityLog,
  forwardMutationToAppsScript,
  loadServerRefundState,
  persistServerRefundState,
  SEED_THUMB_BY_ORDER,
  SEED_THUMB_BY_ROW,
  syncWithGoogleSheetsBackend,
  validateRefundRecordInput
} from '@/lib/server/refund-store';
import { formatDdMmmYyyy, formatINR, recomputeFormulaColumns } from '@/lib/utils/refund-math';
import { RefundRecord, RefundStatusType } from '@/lib/types/refund';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ============================================================================
 * PROTECTED SERVER ROUTE (/api/refunds) — GLEVA REFUND DESK V3
 * - Requires authenticated Super Administrator session (`HttpOnly` signed cookie).
 * - Requires valid CSRF token (`x-csrf-token`) on all POST mutations.
 * - Never exposes Google Apps Script tokens or raw customer records to public
 *   client bundles.
 * ============================================================================
 */

export async function GET(req: NextRequest) {
  const session = await getAuthenticatedSession(req);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: Valid Super Administrator session required.' },
      { status: 401 }
    );
  }
  if (session.mustChangePassword) {
    return NextResponse.json(
      { error: 'Mandatory password change required before accessing refund records.' },
      { status: 403 }
    );
  }

  const forceLive = req.nextUrl.searchParams.get('sync') === 'live';
  const { state, remoteSynced } = await syncWithGoogleSheetsBackend(forceLive);

  return NextResponse.json({
    status: 'ok',
    syncMode: state.syncMode,
    remoteSynced,
    appsScriptConfigured: Boolean(process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL),
    lastSyncTime: state.lastSyncTime,
    lastSyncError: state.lastSyncError || null,
    count: state.records.length,
    records: state.records,
    activityLogs: state.activityLogs
  });
}

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedSession(req);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: Valid Super Administrator session required.' },
      { status: 401 }
    );
  }
  if (session.mustChangePassword) {
    return NextResponse.json(
      { error: 'Mandatory password change required before modifying refund records.' },
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
    const action = String(body.action || 'update');
    const state = loadServerRefundState();
    const operatorLabel = `${session.username} (${session.email})`;

    if (action === 'create') {
      const rawRecord = (body.record || {}) as Partial<RefundRecord>;
      const validation = validateRefundRecordInput(rawRecord, true);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const cleanOrderId = String(rawRecord.orderId || '').trim();
      const duplicateExists = state.records.some(
        r => r.orderId.trim().toLowerCase() === cleanOrderId.toLowerCase()
      );
      if (duplicateExists && !body.allowDuplicateOrderId) {
        return NextResponse.json(
          {
            error: `Duplicate Order ID detected: ${cleanOrderId} already exists in MASTER REFUND DATA. Confirm duplicate override if intentional.`,
            code: 'DUPLICATE_ORDER_ID'
          },
          { status: 409 }
        );
      }

      const nextRow =
        state.records.length > 0 ? Math.max(...state.records.map(r => r.rowNumber)) + 1 : 67;

      if (rawRecord.screenshotThumb) {
        state.uploadedScreenshots[cleanOrderId.toUpperCase()] = rawRecord.screenshotThumb;
      }

      const newRec = recomputeFormulaColumns(
        {
          ...rawRecord,
          rowNumber: nextRow,
          caseId: `CASE-${String(nextRow - 1).padStart(3, '0')}-${cleanOrderId}`,
          orderId: cleanOrderId,
          screenshotDate: rawRecord.screenshotThumb
            ? formatDdMmmYyyy(new Date().toISOString().slice(0, 10))
            : ''
        },
        false,
        {
          byOrder: { ...SEED_THUMB_BY_ORDER, ...state.uploadedScreenshots },
          byRow: SEED_THUMB_BY_ROW
        }
      );

      state.records = [newRec, ...state.records];
      const logEntry = appendServerActivityLog(state, {
        operator: operatorLabel,
        rowNumber: nextRow,
        orderId: cleanOrderId,
        fieldChanged: 'Created Refund Record',
        oldValue: '(New Row)',
        newValue: `${newRec.refundStatus} • ${formatINR(newRec.amount)} • ${newRec.month}`,
        changeType: 'Web App Create'
      });
      persistServerRefundState(state);

      const remoteRes = await forwardMutationToAppsScript('create', newRec, session.email);
      return NextResponse.json({
        status: 'created',
        record: newRec,
        logEntry,
        remoteSync: remoteRes
      });
    }

    if (action === 'update') {
      const rawRecord = (body.record || {}) as Partial<RefundRecord>;
      const validation = validateRefundRecordInput(rawRecord, true);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const targetIdx = state.records.findIndex(
        r =>
          r.caseId === rawRecord.caseId ||
          r.orderId.toLowerCase() === String(rawRecord.orderId || '').trim().toLowerCase()
      );
      if (targetIdx === -1) {
        return NextResponse.json(
          { error: `Refund record not found for Order ID ${rawRecord.orderId}` },
          { status: 404 }
        );
      }

      const existing = state.records[targetIdx];
      const recomputed = recomputeFormulaColumns(
        {
          ...existing,
          ...rawRecord,
          lastUpdated: formatDdMmmYyyy(new Date().toISOString().slice(0, 10))
        },
        true,
        {
          byOrder: { ...SEED_THUMB_BY_ORDER, ...state.uploadedScreenshots },
          byRow: SEED_THUMB_BY_ROW
        }
      );

      state.records[targetIdx] = recomputed;
      const logEntry = appendServerActivityLog(state, {
        operator: operatorLabel,
        rowNumber: recomputed.rowNumber,
        orderId: recomputed.orderId,
        fieldChanged: String(body.changeDescription || 'Updated Refund Record'),
        oldValue: String(body.oldValue || `${existing.refundStatus} (${formatINR(existing.amount)})`),
        newValue: String(body.newValue || `${recomputed.refundStatus} (${formatINR(recomputed.amount)})`),
        changeType: 'Web App Edit'
      });
      persistServerRefundState(state);

      const remoteRes = await forwardMutationToAppsScript('update', recomputed, session.email);
      return NextResponse.json({
        status: 'updated',
        record: recomputed,
        logEntry,
        remoteSync: remoteRes
      });
    }

    if (action === 'bulkUpdate') {
      const caseIds: string[] = Array.isArray(body.caseIds) ? body.caseIds : [];
      const newStatus = body.refundStatus as RefundStatusType;
      if (caseIds.length === 0 || !newStatus) {
        return NextResponse.json(
          { error: 'Select at least one case and a valid target status for bulk update.' },
          { status: 400 }
        );
      }

      const idSet = new Set(caseIds);
      const updatedRecords: RefundRecord[] = [];
      const todayIso = new Date().toISOString().slice(0, 10);

      state.records = state.records.map(r => {
        if (!idSet.has(r.caseId)) return r;
        const processedDate =
          newStatus === 'Processed' && !r.processedDate ? todayIso : r.processedDate;
        const updated = recomputeFormulaColumns(
          {
            ...r,
            refundStatus: newStatus,
            processedDate,
            lastUpdated: formatDdMmmYyyy(todayIso)
          },
          true,
          {
            byOrder: { ...SEED_THUMB_BY_ORDER, ...state.uploadedScreenshots },
            byRow: SEED_THUMB_BY_ROW
          }
        );
        updatedRecords.push(updated);
        return updated;
      });

      const logEntry = appendServerActivityLog(state, {
        operator: operatorLabel,
        rowNumber: 0,
        orderId: `${updatedRecords.length} Cases`,
        fieldChanged: 'Bulk Status Update',
        oldValue: 'Multiple Statuses',
        newValue: `Marked ${updatedRecords.length} case(s) as ${newStatus}`,
        changeType: 'Bulk Update'
      });
      persistServerRefundState(state);

      const remoteRes = await forwardMutationToAppsScript(
        'bulkUpdate',
        { caseIds, refundStatus: newStatus, updatedOrders: updatedRecords.map(u => u.orderId) },
        session.email
      );

      return NextResponse.json({
        status: 'bulk_updated',
        updatedCount: updatedRecords.length,
        records: state.records,
        logEntry,
        remoteSync: remoteRes
      });
    }

    if (action === 'delete') {
      const rawRecord = (body.record || {}) as Partial<RefundRecord>;
      const targetOrderId = String(rawRecord.orderId || body.orderId || '').trim();
      if (!targetOrderId) {
        return NextResponse.json(
          { error: 'Missing Order ID for delete operation.' },
          { status: 400 }
        );
      }

      const target = state.records.find(
        r => r.orderId.toLowerCase() === targetOrderId.toLowerCase()
      );
      if (!target) {
        return NextResponse.json(
          { error: `Order ID ${targetOrderId} not found.` },
          { status: 404 }
        );
      }

      state.deletedOrderIds = Array.from(
        new Set([...state.deletedOrderIds, targetOrderId.toUpperCase()])
      );
      state.records = state.records.filter(
        r => r.orderId.toLowerCase() !== targetOrderId.toLowerCase()
      );

      const logEntry = appendServerActivityLog(state, {
        operator: operatorLabel,
        rowNumber: target.rowNumber,
        orderId: target.orderId,
        fieldChanged: 'Deleted Refund Record',
        oldValue: `${target.customerName} (${formatINR(target.amount)})`,
        newValue: 'Removed from Ledger',
        changeType: 'Web App Edit'
      });
      persistServerRefundState(state);

      const remoteRes = await forwardMutationToAppsScript('delete', target, session.email);
      return NextResponse.json({
        status: 'deleted',
        deletedOrderId: target.orderId,
        logEntry,
        remoteSync: remoteRes
      });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to process refund operation' },
      { status: 500 }
    );
  }
}
