import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidPhone, phoneSchema } from '../phone';

describe('normalizePhone', () => {
  it('strips spaces, dashes, dots and brackets', () => {
    expect(normalizePhone('+974 5512-3456')).toBe('+97455123456');
    expect(normalizePhone('(050) 123.4567')).toBe('0501234567');
  });
});

describe('isValidPhone', () => {
  it.each(['55123456', '+97455123456', '0501234567', '03001234567', '1234567'])('accepts %s', (p) => {
    expect(isValidPhone(p)).toBe(true);
  });
  it.each(['', '+', '123456', '1234567890123456', '55123x56', '++97455123456'])('rejects "%s"', (p) => {
    expect(isValidPhone(p)).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('returns the normalized number', () => {
    expect(phoneSchema.parse('+974 5512 3456')).toBe('+97455123456');
  });
  it('rejects garbage with a readable message', () => {
    const r = phoneSchema.safeParse('hello');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/valid phone number/i);
  });
});
