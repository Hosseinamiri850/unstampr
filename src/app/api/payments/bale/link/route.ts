import { getSession } from '@/lib/auth/session';
import { getEnv } from '@/lib/env';
import { baleConfigured } from '@/lib/payments/bale';
import { createLinkCode, getLink, revokeLink } from '@/lib/payments/bale-linking';
import { AppError } from '@/lib/types';
import { ok, fail, handleError } from '@/lib/api/http';


export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError('UNAUTHORIZED', undefined, 401);
    const link = await getLink(session.userId);
    return ok({
      configured: baleConfigured(),
      linked: Boolean(link),
      chatId: link?.chatId ?? null,
      username: link?.username ?? null,
    });
  } catch (e) {
    return handleError(e);
  }
}

/** Issue a fresh one-time linking code (raw code shown once, never stored raw). */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) throw new AppError('UNAUTHORIZED', undefined, 401);
    if (!baleConfigured()) return fail('BALE_NOT_CONFIGURED', 400);
    const env = getEnv();
    const { code, expiresAt } = await createLinkCode(session.userId, env.BALE_LINK_CODE_TTL_SEC);
    const botUsername = process.env.BALE_BOT_USERNAME ?? 'pakino_bot';
    return ok({
      code,
      expiresAt: expiresAt.toISOString(),
      botUsername,
      deepLink: `https://ble.ir/${botUsername}?start=${code}`,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) throw new AppError('UNAUTHORIZED', undefined, 401);
    const removed = await revokeLink(session.userId);
    return ok({ revoked: removed });
  } catch (e) {
    return handleError(e);
  }
}
