import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';

const ROUNDS = 10;
const BCRYPT_PREFIX = /^\$2[aby]\$\d{2}\$/;

// Compared against when the username doesn't exist, so a failed login takes
// about as long whether or not the account is real.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/**
 * Checks a password against what is stored. Rows created before hashing was
 * added hold the plain password, so those are compared directly and flagged
 * with needsRehash, letting the caller upgrade them on a successful login.
 */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (BCRYPT_PREFIX.test(stored)) {
    return { ok: await bcrypt.compare(plain, stored), needsRehash: false };
  }
  const a = Buffer.from(plain);
  const b = Buffer.from(stored);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}
