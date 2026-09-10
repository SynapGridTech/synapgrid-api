import { generateSecureToken, normalizeEmail, sha256Hex, truncate } from './strings.util';

describe('strings.util', () => {
  it('generateSecureToken produces URL-safe, unpredictable values of expected length', () => {
    const token = generateSecureToken(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateSecureToken(32)).not.toEqual(token);
  });

  it('sha256Hex is deterministic and 64 hex chars long', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abc')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('truncate keeps short strings and elides long ones', () => {
    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('a'.repeat(50), 10)).toHaveLength(10);
    expect(truncate('a'.repeat(50), 10).endsWith('…')).toBe(true);
  });

  it('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });
});
