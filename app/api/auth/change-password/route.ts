import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminCredentials,
  hashPasswordSync,
  saveUpdatedAdminPasswordHash,
  validateNewPasswordStrength,
  verifyPasswordSync
} from '@/lib/auth/password';
import {
  attachSessionCookies,
  createSessionPayload,
  getAuthenticatedSession,
  GLEVA_PWD_VAULT_COOKIE,
  verifyCsrfProtection
} from '@/lib/auth/session';
import { signVaultValue, verifyVaultValue } from '@/lib/auth/edge-token';
import { appendServerActivityLog, loadServerRefundState, persistServerRefundState } from '@/lib/server/refund-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in first.' },
        { status: 401 }
      );
    }

    const csrfCheck = verifyCsrfProtection(req, session);
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { error: csrfCheck.reason || 'CSRF validation failed.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All password fields are required.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation password do not match.' },
        { status: 400 }
      );
    }

    const signedVaultCookie = req.cookies.get(GLEVA_PWD_VAULT_COOKIE)?.value;
    const verifiedVaultHash = await verifyVaultValue(signedVaultCookie);
    const adminCreds = getAdminCredentials(verifiedVaultHash || undefined);

    if (!verifyPasswordSync(currentPassword, adminCreds.passwordHash)) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 401 }
      );
    }

    const strength = validateNewPasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json(
        { error: strength.error },
        { status: 400 }
      );
    }

    const newHash = hashPasswordSync(newPassword);
    saveUpdatedAdminPasswordHash(newHash);

    const updatedPayload = createSessionPayload({
      username: session.username,
      mustChangePassword: false,
      rememberMe: session.rememberMe
    });

    const state = loadServerRefundState();
    appendServerActivityLog(state, {
      operator: `${session.username} (${session.email})`,
      rowNumber: 0,
      orderId: 'AUTH-PWD-ROTATE',
      fieldChanged: 'Administrator Password Changed',
      oldValue: 'Temporary Initial Credential',
      newValue: 'Rotated to Argon2id/Scrypt Hash',
      changeType: 'Security Audit'
    });
    persistServerRefundState(state);

    const res = NextResponse.json({
      status: 'password_updated',
      message: 'Your administrator password has been securely updated.',
      user: {
        username: updatedPayload.username,
        role: updatedPayload.role,
        email: updatedPayload.email,
        displayName: updatedPayload.displayName,
        mustChangePassword: false,
        rememberMe: updatedPayload.rememberMe,
        expiresAt: updatedPayload.exp * 1000
      },
      csrfToken: updatedPayload.csrfToken,
      envHashHint: newHash
    });

    const signedVault = await signVaultValue(newHash);
    res.cookies.set(GLEVA_PWD_VAULT_COOKIE, signedVault, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60
    });

    return await attachSessionCookies(res, updatedPayload);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
