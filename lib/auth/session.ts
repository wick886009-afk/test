import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AdminSessionPayload } from '@/lib/types/refund';
import {
  GLEVA_CSRF_COOKIE,
  GLEVA_PWD_VAULT_COOKIE,
  GLEVA_SESSION_COOKIE,
  signSessionToken,
  verifySessionToken
} from '@/lib/auth/edge-token';

export const STANDARD_SESSION_TTL_SEC = 8 * 60 * 60; // 8 hours
export const REMEMBER_ME_SESSION_TTL_SEC = 14 * 24 * 60 * 60; // 14 days

export function createSessionPayload(options: {
  username: string;
  mustChangePassword: boolean;
  rememberMe: boolean;
}): AdminSessionPayload {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = options.rememberMe ? REMEMBER_ME_SESSION_TTL_SEC : STANDARD_SESSION_TTL_SEC;
  const csrfToken = crypto.randomBytes(24).toString('hex');

  return {
    username: options.username,
    role: 'Super Administrator',
    email: process.env.GLEVA_ADMIN_EMAIL || 'anas.saifee@gleva.in',
    displayName: 'Anas Saifee',
    mustChangePassword: options.mustChangePassword,
    rememberMe: options.rememberMe,
    iat: nowSec,
    exp: nowSec + ttl,
    csrfToken
  };
}

export async function attachSessionCookies(
  res: NextResponse,
  payload: AdminSessionPayload
): Promise<NextResponse> {
  const token = await signSessionToken(payload);
  const maxAge = Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
  const isProd = process.env.NODE_ENV === 'production';

  res.cookies.set(GLEVA_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge
  });

  res.cookies.set(GLEVA_CSRF_COOKIE, payload.csrfToken, {
    httpOnly: false, // readable by legitimate same-origin client JS to send in x-csrf-token header
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge
  });

  return res;
}

export function clearSessionCookies(res: NextResponse): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set(GLEVA_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  res.cookies.set(GLEVA_CSRF_COOKIE, '', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  return res;
}

export async function getAuthenticatedSession(
  req: NextRequest
): Promise<AdminSessionPayload | null> {
  const token = req.cookies.get(GLEVA_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function verifyCsrfProtection(
  req: NextRequest,
  session: AdminSessionPayload
): { valid: boolean; reason?: string } {
  const headerToken = req.headers.get('x-csrf-token') || '';
  const cookieToken = req.cookies.get(GLEVA_CSRF_COOKIE)?.value || '';
  if (!headerToken) {
    return { valid: false, reason: 'Missing CSRF security token header (x-csrf-token).' };
  }
  if (headerToken !== session.csrfToken && headerToken !== cookieToken) {
    return { valid: false, reason: 'Invalid CSRF security token.' };
  }
  return { valid: true };
}

export { GLEVA_PWD_VAULT_COOKIE };
