import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, getAuthenticatedSession } from '@/lib/auth/session';
import { appendServerActivityLog, loadServerRefundState, persistServerRefundState } from '@/lib/server/refund-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedSession(req);
  if (session) {
    const state = loadServerRefundState();
    appendServerActivityLog(state, {
      operator: `${session.username} (${session.email})`,
      rowNumber: 0,
      orderId: 'AUTH-LOGOUT',
      fieldChanged: 'Administrator Logout',
      oldValue: 'Active Session',
      newValue: 'Session Terminated',
      changeType: 'Security Audit'
    });
    persistServerRefundState(state);
  }

  const res = NextResponse.json({ status: 'logged_out' });
  return clearSessionCookies(res);
}
