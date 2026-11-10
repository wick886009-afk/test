/**
 * ============================================================================
 * SLIDING-WINDOW BRUTE-FORCE & LOGIN RATE LIMITER
 * Protects /api/auth/login and sensitive mutating endpoints from brute-force
 * credential stuffing.
 * ============================================================================
 */

interface RateLimitBucket {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const loginBuckets = new Map<string, RateLimitBucket>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout after 5 failed attempts

export function getClientIdentifier(headers: Headers, username = ''): string {
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const ip = (forwarded ? forwarded.split(',')[0].trim() : realIp) || 'local-ip';
  return `${ip}:${username.toLowerCase().trim() || 'anon'}`;
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const bucket = loginBuckets.get(key);
  if (!bucket) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  if (bucket.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((bucket.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  if (now - bucket.firstAttemptAt > WINDOW_MS) {
    loginBuckets.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - bucket.attempts);
  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    retryAfterSeconds: 0
  };
}

export function recordFailedLoginAttempt(key: string): {
  remainingAttempts: number;
  locked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const existing = loginBuckets.get(key);
  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) {
    const next: RateLimitBucket = {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: 0
    };
    loginBuckets.set(key, next);
    return {
      remainingAttempts: MAX_ATTEMPTS - 1,
      locked: false,
      retryAfterSeconds: 0
    };
  }

  existing.attempts += 1;
  if (existing.attempts >= MAX_ATTEMPTS) {
    existing.lockedUntil = now + LOCKOUT_MS;
    loginBuckets.set(key, existing);
    return {
      remainingAttempts: 0,
      locked: true,
      retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000)
    };
  }

  loginBuckets.set(key, existing);
  return {
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - existing.attempts),
    locked: false,
    retryAfterSeconds: 0
  };
}

export function clearLoginRateLimit(key: string): void {
  loginBuckets.delete(key);
}
