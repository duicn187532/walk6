// Password hashing for self-registration (scrypt, per-user salt). MVP: no sessions/tokens —
// the client just remembers the logged-in user id.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const DEMO_PASSWORD = 'walk1234';
