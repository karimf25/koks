import { db, integrations } from "@/db";
import { eq } from "drizzle-orm";

export type IntegrationRow = typeof integrations.$inferSelect;

export type MicrosoftMeta = {
  account?: string; // display name / email of connected account
  listId?: string; // chosen To Do list to sync
  listName?: string;
  lastSyncedAt?: string; // ISO
  lastResult?: {
    at: string;
    pulled: number;
    pushed: number;
    created: number;
    ok: boolean;
    error?: string;
  };
};

export async function getIntegration(provider: string): Promise<IntegrationRow | null> {
  const [row] = await db.select().from(integrations).where(eq(integrations.provider, provider));
  return row ?? null;
}

export async function upsertIntegration(input: {
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}): Promise<IntegrationRow> {
  const existing = await getIntegration(input.provider);
  if (existing) {
    const [row] = await db
      .update(integrations)
      .set({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? existing.refreshToken,
        expiresAt: input.expiresAt ?? existing.expiresAt,
        metadata: (input.metadata ?? existing.metadata) as any,
        updatedAt: new Date(),
      })
      .where(eq(integrations.provider, input.provider))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(integrations)
    .values({
      provider: input.provider,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      metadata: (input.metadata ?? {}) as any,
    })
    .returning();
  return row;
}

export async function updateIntegrationMetadata(
  provider: string,
  patch: Record<string, unknown>
): Promise<IntegrationRow | null> {
  const existing = await getIntegration(provider);
  if (!existing) return null;
  const merged = { ...(existing.metadata as Record<string, unknown>), ...patch };
  const [row] = await db
    .update(integrations)
    .set({ metadata: merged as any, updatedAt: new Date() })
    .where(eq(integrations.provider, provider))
    .returning();
  return row ?? null;
}

export async function deleteIntegration(provider: string): Promise<void> {
  await db.delete(integrations).where(eq(integrations.provider, provider));
}
