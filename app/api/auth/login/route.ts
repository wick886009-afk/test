import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminCredentials,
  verifyPasswordSync
} from '@/lib/auth/password';
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getClientIdentifier,
  recordFailedLoginAttempt
} from '@/lib/auth/rate-limit';
import {
  attachSessionCookies,
  createSessionPayload,
  GLEVA_PWD_VAULT_COOKIE
} from '@/lib/auth/session';
import { verifyVaultValue } from '@/lib/auth/edge-token';
import { appendServerActivityLog, loadServerRefundState, persistServerRefundState } from '@/lib/server/refund-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const rememberMe = Boolean(body.rememberMe);

    const clientKey = getClientIdentifier(req.headers, username);
    const rateCheck = checkLoginRateLimit(clientKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Account temporarily locked for ${Math.ceil(
            rateCheck.retryAfterSeconds / 60
          )} minute(s).`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Please enter both username and password.' },
        { status: 400 }
      );
    }

    const signedVaultCookie = req.cookies.get(GLEVA_PWD_VAULT_COOKIE)?.value;
    const verifiedVaultHash = await verifyVaultValue(signedVaultCookie);
    const adminCreds = getAdminCredentials(verifiedVaultHash || undefined);

    const isUsernameMatch = username.toLowerCase() === adminCreds.username.toLowerCase();
    const isPasswordValid = verifyPasswordSync(password, adminCreds.passwordHash);

    if (!isUsernameMatch || !isPasswordValid) {
      const failState = recordFailedLoginAttempt(clientKey);
      return NextResponse.json(
        {
          error: failState.locked
            ? 'Maximum login attempts exceeded. Locked for 15 minutes.'
            : `Invalid administrator credentials. ${failState.remainingAttempts} attempt(s) remaining.`,
          remainingAttempts: failState.remainingAttempts,
          retryAfterSeconds: failState.retryAfterSeconds
        },
        { status: 401 }
      );
    }

    // Successful authentication: clear rate limit counter
    clearLoginRateLimit(clientKey);

    const sessionPayload = createSessionPayload({
      username: adminCreds.username,
      mustChangePassword: adminCreds.mustChangePassword,
      rememberMe
    });

    // Log security event
    const state = loadServerRefundState();
    appendServerActivityLog(state, {
      operator: `${sessionPayload.username} (${sessionPayload.email})`,
      rowNumber: 0,
      orderId: 'AUTH-LOGIN',
      fieldChanged: 'Administrator Login',
      oldValue: 'Unauthenticated',
      newValue: adminCreds.mustChangePassword
        ? 'Authenticated (Temporary Password — Mandatory Change Triggered)'
        : `Authenticated (${rememberMe ? 'Remember Me 14d' : 'Standard 8h Session'})`,
      changeType: 'Security Audit'
    });
    persistServerRefundState(state);

    const res = NextResponse.json({
      status: 'authenticated',
      user: {
        username: sessionPayload.username,
        role: sessionPayload.role,
        email: sessionPayload.email,
        displayName: sessionPayload.displayName,
        mustChangePassword: sessionPayload.mustChangePassword,
        rememberMe: sessionPayload.rememberMe,
        expiresAt: sessionPayload.exp * 1000
      },
      csrfToken: sessionPayload.csrfToken
    });

    return await attachSessionCookies(res, sessionPayload);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal authentication error' },
      { status: 500 }
    );
  }
}
