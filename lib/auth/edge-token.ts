import { AdminSessionPayload } from '@/lib/types/refund';

export const GLEVA_SESSION_COOKIE = 'gleva_v3_session';
export const GLEVA_CSRF_COOKIE = 'gleva_v3_csrf';
export const GLEVA_PWD_VAULT_COOKIE = 'gleva_v3_pwd_vault';

function getSessionSecret(): string {
  return (
    process.env.GLEVA_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'gleva-cosmetics-v3-hmac-sha256-signing-secret-key-2026-prod'
  );
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(bytes).toString('base64')
      : btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str: string): string {
  const encoder = new TextEncoder();
  return base64UrlEncodeBytes(encoder.encode(str));
}

function base64UrlDecodeToString(b64url: string): string {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf-8');
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function computeHmacSha256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

function constantTimeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signSessionToken(payload: AdminSessionPayload): Promise<string> {
  const secret = getSessionSecret();
  const headerB64 = base64UrlEncodeString(JSON.stringify({ alg: 'HS256', typ: 'GLEVA-SESS' }));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;
  const sig = await computeHmacSha256(unsigned, secret);
  return `${unsigned}.${sig}`;
}

export async function verifySessionToken(token?: string | null): Promise<AdminSessionPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  try {
    const secret = getSessionSecret();
    const expectedSig = await computeHmacSha256(`${headerB64}.${payloadB64}`, secret);
    if (!constantTimeEqualString(signature, expectedSig)) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecodeToString(payloadB64)) as AdminSessionPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowSec) {
      return null;
    }
    if (!payload.username || payload.role !== 'Super Administrator') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function signVaultValue(rawValue: string): Promise<string> {
  const secret = getSessionSecret();
  const valB64 = base64UrlEncodeString(rawValue);
  const sig = await computeHmacSha256(valB64, secret);
  return `${valB64}.${sig}`;
}

export async function verifyVaultValue(signedValue?: string | null): Promise<string | null> {
  if (!signedValue || typeof signedValue !== 'string') return null;
  const idx = signedValue.lastIndexOf('.');
  if (idx === -1) return null;
  const valB64 = signedValue.slice(0, idx);
  const sig = signedValue.slice(idx + 1);
  try {
    const expected = await computeHmacSha256(valB64, getSessionSecret());
    if (!constantTimeEqualString(sig, expected)) return null;
    return base64UrlDecodeToString(valB64);
  } catch {
    return null;
  }
}
