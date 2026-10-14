import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, DUMMY_HASH } from '../password';

describe('password helpers', () => {
  it('stores a bcrypt hash, never the plain password', async () => {
    const hash = await hashPassword('correct-horse');
    expect(hash).not.toContain('correct-horse');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct-horse');
    expect(await verifyPassword('correct-horse', hash)).toEqual({ ok: true, needsRehash: false });
    expect(await verifyPassword('wrong', hash)).toEqual({ ok: false, needsRehash: false });
  });

  it('accepts a legacy plain-text row once and flags it for upgrade', async () => {
    expect(await verifyPassword('admin123', 'admin123')).toEqual({ ok: true, needsRehash: true });
    expect(await verifyPassword('admin124', 'admin123')).toEqual({ ok: false, needsRehash: false });
    expect(await verifyPassword('x', 'admin123')).toEqual({ ok: false, needsRehash: false });
  });

  it('never matches the dummy hash used for unknown usernames', async () => {
    expect((await verifyPassword('anything', DUMMY_HASH)).ok).toBe(false);
  });
});
