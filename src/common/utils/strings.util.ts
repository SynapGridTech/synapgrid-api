import { createHash, randomBytes } from 'crypto';

/** Generates a cryptographically random, URL-safe token. */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 one-way hash (hex), used for hashing public tracking/reference tokens. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Truncates a string safely for storage / logging. */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

/** Normalizes an email address for comparison/storage. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
