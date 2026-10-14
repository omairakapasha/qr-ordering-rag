import { z } from 'zod';

/** Strips spaces, dashes, dots and brackets so "+974 5512-3456" and "+97455123456" compare equal. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

// International numbers run to at most 15 digits (E.164), with an optional
// leading "+". The lower bound of 7 covers the shortest local numbers in use.
const PHONE_RE = /^\+?\d{7,15}$/;

export function isValidPhone(normalized: string): boolean {
  return PHONE_RE.test(normalized);
}

export const phoneSchema = z
  .string()
  .max(30, 'Enter a valid phone number')
  .transform(normalizePhone)
  .pipe(z.string().regex(PHONE_RE, 'Enter a valid phone number, for example +974 5512 3456'));
