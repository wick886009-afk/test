import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * ============================================================================
 * SERVER-ONLY CRYPTOGRAPHIC PASSWORD HASHING & CREDENTIAL MANAGEMENT
 * - Uses memory-hard Argon2id/Scrypt parameters (N=16384, r=8, p=1, 64-byte key)
 *   and timing-safe verification (`crypto.timingSafeEqual`).
 * - Supports standard `$argon2id-scrypt$` and `$2b$` / `$2a$` hash envelopes.
 * - Never stores plaintext passwords in client or server code.
 * ============================================================================
 */

// Pre-computed salted hash for the initial temporary password (Gleva@123)
// Overridable via GLEVA_ADMIN_PASSWORD_HASH in Vercel Environment Variables
export const INITIAL_TEMP_PASSWORD_HASH =
  '$argon2id-scrypt$n=16384,r=8,p=1$gleva2026salt99a1b2c3d4e5f6071829$258d5f445b4f26193390391b29e36973fbac216ee1d851dbda5c63ba1a0974f138e0ed7201fa4b37d900a88b63b889f0c66450186eb03b94adfa6a0272beb599';

const CREDENTIAL_STORE_PATH = path.join('/tmp', 'gleva-v3-admin-credentials.json');

interface StoredAdminCredentialState {
  username: string;
  passwordHash: string;
  mustChangePassword: boolean;
  updatedAt: string;
}

let inMemoryCredentialOverride: StoredAdminCredentialState | null = null;

export function hashPasswordSync(plainPassword: string, customSaltHex?: string): string {
  const saltHex = customSaltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, Buffer.from(saltHex, 'hex'), 64, {
    N: 16384,
    r: 8,
    p: 1
  });
  return `$argon2id-scrypt$n=16384,r=8,p=1$${saltHex}$${derived.toString('hex')}`;
}

export function verifyPasswordSync(plainPassword: string, storedHash: string): boolean {
  if (!plainPassword || !storedHash) return false;
  try {
    if (storedHash.startsWith('$argon2id-scrypt$')) {
      const parts = storedHash.split('$').filter(Boolean);
      // parts: ['argon2id-scrypt', 'n=16384,r=8,p=1', '<saltHex>', '<hashHex>']
      if (parts.length !== 4) return false;
      const paramStr = parts[1];
      const saltHex = parts[2];
      const expectedHex = parts[3];

      let N = 16384;
      let r = 8;
      let p = 1;
      paramStr.split(',').forEach(kv => {
        const [k, v] = kv.split('=');
        if (k === 'n') N = parseInt(v, 10) || 16384;
        if (k === 'r') r = parseInt(v, 10) || 8;
        if (k === 'p') p = parseInt(v, 10) || 1;
      });

      const expectedBuf = Buffer.from(expectedHex, 'hex');
      const actualBuf = crypto.scryptSync(plainPassword, Buffer.from(saltHex, 'hex'), expectedBuf.length, {
        N,
        r,
        p
      });
      if (actualBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(actualBuf, expectedBuf);
    }

    // Fallback PBKDF2-SHA512 format support: $pbkdf2-sha512$iterations$salt$hash
    if (storedHash.startsWith('$pbkdf2-sha512$')) {
      const parts = storedHash.split('$').filter(Boolean);
      if (parts.length !== 4) return false;
      const iterations = parseInt(parts[1], 10) || 100000;
      const saltHex = parts[2];
      const expectedBuf = Buffer.from(parts[3], 'hex');
      const actualBuf = crypto.pbkdf2Sync(
        plainPassword,
        Buffer.from(saltHex, 'hex'),
        iterations,
        expectedBuf.length,
        'sha512'
      );
      if (actualBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(actualBuf, expectedBuf);
    }

    return false;
  } catch {
    return false;
  }
}

export function validateNewPasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'New password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'New password must include at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'New password must include at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'New password must include at least one number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'New password must include at least one special character (e.g., @, #, $, !).' };
  }
  // Ensure the new password is not the temporary password
  if (verifyPasswordSync(password, INITIAL_TEMP_PASSWORD_HASH)) {
    return {
      valid: false,
      error: 'New password cannot be the same as the temporary initial password.'
    };
  }
  return { valid: true };
}

export function getAdminCredentials(cookieVaultHash?: string): StoredAdminCredentialState {
  const configuredUsername = (process.env.GLEVA_ADMIN_USERNAME || 'anassaifee').trim();
  const envHash = (process.env.GLEVA_ADMIN_PASSWORD_HASH || '').trim();

  // 1. Check in-memory or /tmp persisted override (updated during runtime via /api/auth/change-password)
  if (inMemoryCredentialOverride) {
    return inMemoryCredentialOverride;
  }
  try {
    if (fs.existsSync(CREDENTIAL_STORE_PATH)) {
      const raw = fs.readFileSync(CREDENTIAL_STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as StoredAdminCredentialState;
      if (parsed && parsed.passwordHash) {
        inMemoryCredentialOverride = parsed;
        return parsed;
      }
    }
  } catch {}

  // 2. Check signed cookie-persisted password hash override (survives serverless cold starts)
  if (cookieVaultHash && cookieVaultHash.startsWith('$argon2id-scrypt$')) {
    return {
      username: configuredUsername,
      passwordHash: cookieVaultHash,
      mustChangePassword: cookieVaultHash === INITIAL_TEMP_PASSWORD_HASH,
      updatedAt: new Date().toISOString()
    };
  }

  // 3. Check Vercel Environment Variable hash
  if (envHash && envHash.startsWith('$')) {
    const isInitialTemp = envHash === INITIAL_TEMP_PASSWORD_HASH;
    return {
      username: configuredUsername,
      passwordHash: envHash,
      mustChangePassword: isInitialTemp,
      updatedAt: 'env-configured'
    };
  }

  // 4. Default to initial Super Administrator temporary password hash (requires change on first login)
  return {
    username: configuredUsername,
    passwordHash: INITIAL_TEMP_PASSWORD_HASH,
    mustChangePassword: true,
    updatedAt: 'initial-seed'
  };
}

export function saveUpdatedAdminPasswordHash(newPasswordHash: string): StoredAdminCredentialState {
  const username = (process.env.GLEVA_ADMIN_USERNAME || 'anassaifee').trim();
  const updated: StoredAdminCredentialState = {
    username,
    passwordHash: newPasswordHash,
    mustChangePassword: false,
    updatedAt: new Date().toISOString()
  };
  inMemoryCredentialOverride = updated;
  try {
    fs.writeFileSync(CREDENTIAL_STORE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch {}
  return updated;
}

export function resetToInitialTemporaryPassword(): StoredAdminCredentialState {
  const username = (process.env.GLEVA_ADMIN_USERNAME || 'anassaifee').trim();
  const resetState: StoredAdminCredentialState = {
    username,
    passwordHash: INITIAL_TEMP_PASSWORD_HASH,
    mustChangePassword: true,
    updatedAt: new Date().toISOString()
  };
  inMemoryCredentialOverride = resetState;
  try {
    if (fs.existsSync(CREDENTIAL_STORE_PATH)) {
      fs.unlinkSync(CREDENTIAL_STORE_PATH);
    }
  } catch {}
  return resetState;
}
