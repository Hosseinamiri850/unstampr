import { db, schema } from '@/lib/db/client';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';

export interface LinkCode {
  code: string; // raw, shown once to the requesting user — never logged
  expiresAt: Date;
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/** Issue a single-use linking code for the user. Old unused codes for the same
 * user are consumed (revoked) so at most one live code exists per user. */
export async function createLinkCode(userId: string, ttlSec: number): Promise<LinkCode> {
  const code = randomBytes(20).toString('hex'); // 160-bit
  const expiresAt = new Date(Date.now() + ttlSec * 1000);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.baleLinkCodes)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.baleLinkCodes.userId, userId), isNull(schema.baleLinkCodes.usedAt)));
    await tx.insert(schema.baleLinkCodes).values({ codeHash: hashCode(code), userId, expiresAt });
  });
  return { code, expiresAt };
}

export type LinkResult =
  | { ok: true; userId: string; relinked: boolean }
  | { ok: false; reason: 'INVALID_CODE' | 'EXPIRED_CODE' | 'CODE_BOUND_TO_OTHER_USER' | 'CHAT_ALREADY_LINKED' };

/** Consume a one-time code and bind chat<->user. All-or-nothing in one tx:
 * the guarded UPDATE on the code row is the single-use latch; bale_links'
 * unique indexes reject cross-user chat sharing. */
export async function consumeLinkCode(
  rawCode: string,
  chatId: string,
  baleUserId: string,
  username?: string,
): Promise<LinkResult> {
  if (!rawCode || rawCode.length > 128) return { ok: false, reason: 'INVALID_CODE' };
  const codeHash = hashCode(rawCode);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [code] = await tx
      .select()
      .from(schema.baleLinkCodes)
      .where(and(eq(schema.baleLinkCodes.codeHash, codeHash), isNull(schema.baleLinkCodes.usedAt)))
      .limit(1);
    if (!code) return { ok: false, reason: 'INVALID_CODE' as const };

    const latched = await tx
      .update(schema.baleLinkCodes)
      .set({ usedAt: now })
      .where(and(eq(schema.baleLinkCodes.codeHash, codeHash), isNull(schema.baleLinkCodes.usedAt)))
      .returning({ id: schema.baleLinkCodes.codeHash });
    if (latched.length === 0) return { ok: false, reason: 'INVALID_CODE' as const };

    if (code.expiresAt.getTime() < now.getTime()) return { ok: false, reason: 'EXPIRED_CODE' as const };

    // Chat sharing check: a bale chat may belong to only one pakino user.
    const [chatOwner] = await tx
      .select()
      .from(schema.baleLinks)
      .where(eq(schema.baleLinks.baleChatId, chatId))
      .limit(1);
    if (chatOwner && chatOwner.userId !== code.userId) {
      return { ok: false, reason: 'CHAT_ALREADY_LINKED' as const };
    }
    // Relink detection is about the USER having any prior binding.
    const [userLink] = await tx
      .select()
      .from(schema.baleLinks)
      .where(eq(schema.baleLinks.userId, code.userId))
      .limit(1);
    const relinked = Boolean(userLink);

    // Upsert the link for this user (one row per user by PK). A relink with a
    // different Bale account rotates the binding.
    await tx
      .insert(schema.baleLinks)
      .values({ userId: code.userId, baleChatId: chatId, baleUserId, username, linkedAt: now })
      .onConflictDoUpdate({
        target: schema.baleLinks.userId,
        set: { baleChatId: chatId, baleUserId, username, linkedAt: now },
      });

    return { ok: true, userId: code.userId, relinked };
  });
}

export async function getLink(userId: string): Promise<{ chatId: string; baleUserId: string; username: string | null } | null> {
  const [row] = await db.select().from(schema.baleLinks).where(eq(schema.baleLinks.userId, userId)).limit(1);
  if (!row) return null;
  return { chatId: row.baleChatId, baleUserId: row.baleUserId, username: row.username };
}

export async function revokeLink(userId: string): Promise<boolean> {
  const deleted = await db.delete(schema.baleLinks).where(eq(schema.baleLinks.userId, userId)).returning({ id: schema.baleLinks.userId });
  return deleted.length > 0;
}

/** Housekeeping: drop expired, unused codes. Called opportunistically. */
export async function purgeExpiredCodes(): Promise<void> {
  await db.delete(schema.baleLinkCodes).where(and(sql`used_at IS NULL`, sql`expires_at < now()`));
}
