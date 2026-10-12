import { redis } from '@/lib/queue/redis';

/** Daily usage quota (v1 free model). One Redis counter per user per UTC day;
 * TTL expires at midnight UTC so the counter resets without a cron. */
export async function checkDailyQuota(
  userId: string,
  maxPerDay: number,
): Promise<{ ok: boolean; used: number; remaining: number; resetAt: Date }> {
  const day = new Date().toISOString().slice(0, 10);
  const k = `quota:daily:${userId}:${day}`;
  const count = await redis.incr(k);
  if (count === 1) {
    const midnightUtc = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() + 1,
    );
    await redis.expireat(k, Math.floor(midnightUtc / 1000));
  }
  const resetAt = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1),
  );
  const used = count;
  return { ok: used <= maxPerDay, used, remaining: Math.max(0, maxPerDay - used), resetAt };
}
