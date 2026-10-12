import { describe, it, expect, vi, beforeEach } from 'vitest';

const { incr, expireat } = vi.hoisted(() => ({
  incr: vi.fn(),
  expireat: vi.fn(),
}));

vi.mock('@/lib/queue/redis', () => ({
  redis: { incr, expireat },
}));

import { checkDailyQuota } from '@/lib/api/quota';

describe('checkDailyQuota', () => {
  beforeEach(() => {
    incr.mockReset();
    expireat.mockReset();
  });

  it('counts increments and reports remaining', async () => {
    incr.mockResolvedValue(3);
    const r = await checkDailyQuota('u1', 5);
    expect(r.ok).toBe(true);
    expect(r.used).toBe(3);
    expect(r.remaining).toBe(2);
  });

  it('blocks when count exceeds the daily limit', async () => {
    incr.mockResolvedValue(6);
    const r = await checkDailyQuota('u1', 5);
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('sets expiry only on first increment of the day', async () => {
    incr.mockResolvedValue(1);
    await checkDailyQuota('u1', 5);
    expect(expireat).toHaveBeenCalledTimes(1);

    incr.mockResolvedValue(2);
    expireat.mockClear();
    await checkDailyQuota('u1', 5);
    expect(expireat).not.toHaveBeenCalled();
  });
});
