import { db, schema } from '@/lib/db/client';
import { eq, count, and, gte } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { AppError } from '@/lib/types';
import { ok, handleError } from '@/lib/api/http';
import { getEnv } from '@/lib/env';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError('UNAUTHORIZED', undefined, 401);
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
    if (!user) throw new AppError('NOT_FOUND', undefined, 404);
    const [c] = await db.select({ n: count() }).from(schema.jobs).where(eq(schema.jobs.userId, session.userId));

    // v1 free model: expose today's quota usage so the dashboard meter reflects it.
    const dayStartUtc = new Date();
    dayStartUtc.setUTCHours(0, 0, 0, 0);
    const [today] = await db
      .select({ n: count() })
      .from(schema.jobs)
      .where(and(eq(schema.jobs.userId, session.userId), gte(schema.jobs.createdAt, dayStartUtc)));
    const dailyLimit = getEnv().FREE_DAILY_JOBS;

    return ok({
      credits: user.credits,
      plan: user.plan,
      totalProcessed: c?.n ?? 0,
      quota: { used: today?.n ?? 0, limit: dailyLimit },
    });
  } catch (e) {
    return handleError(e);
  }
}
