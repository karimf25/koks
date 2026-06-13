import { db, attachments, type Attachment } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { createSignedUpload, createSignedDownload, removeObject } from "./storage";
import { randomUUID } from "crypto";

export type OwnerType = "task" | "project";

export type RecordAttachmentInput = {
  ownerType: OwnerType;
  ownerId: string;
  name: string;
  path: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

/** Strip anything that would be awkward in a storage object key. */
function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").replace(/_{2,}/g, "_").slice(0, 120) || "file";
}

export async function listAttachments(ownerType: OwnerType, ownerId: string): Promise<Attachment[]> {
  return db
    .select()
    .from(attachments)
    .where(and(eq(attachments.ownerType, ownerType), eq(attachments.ownerId, ownerId)))
    .orderBy(desc(attachments.createdAt));
}

export async function getAttachment(id: string): Promise<Attachment | null> {
  const [row] = await db.select().from(attachments).where(eq(attachments.id, id));
  return row ?? null;
}

/**
 * Step 1 of upload: hand the browser a signed URL to PUT the file straight to
 * Supabase Storage. Returns the object `path` to send back when recording the row.
 */
export async function prepareUpload(ownerType: OwnerType, ownerId: string, fileName: string) {
  const path = `${ownerType}/${ownerId}/${randomUUID()}-${safeName(fileName)}`;
  const { signedUrl, token } = await createSignedUpload(path);
  return { path, signedUrl, token };
}

/** Step 2 of upload: persist the metadata row once the object is in the bucket. */
export async function recordAttachment(input: RecordAttachmentInput): Promise<Attachment> {
  const [row] = await db
    .insert(attachments)
    .values({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      name: input.name,
      path: input.path,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
    })
    .returning();
  return row;
}

/** A short-lived signed URL to view/download an attachment. */
export async function getAttachmentUrl(id: string): Promise<string | null> {
  const row = await getAttachment(id);
  if (!row) return null;
  return createSignedDownload(row.path);
}

export async function deleteAttachment(id: string): Promise<boolean> {
  const row = await getAttachment(id);
  if (!row) return false;
  // Best-effort object removal; always drop the row so the UI stays consistent.
  try {
    await removeObject(row.path);
  } catch (err) {
    console.error("Failed to remove storage object", row.path, err);
  }
  await db.delete(attachments).where(eq(attachments.id, id));
  return true;
}
