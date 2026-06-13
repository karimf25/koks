import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Single private bucket for all task/project attachments. Objects are namespaced
// by owner (e.g. "task/<id>/<uuid>-<filename>"), access is always via short-lived
// signed URLs — nothing is publicly readable.
export const ATTACHMENTS_BUCKET = "attachments";

const globalForStorage = globalThis as unknown as {
  _supabaseAdmin?: SupabaseClient;
  _bucketEnsured?: boolean;
};

/** Service-role client — bypasses RLS. Server-only; never ship the service key to the browser. */
export function supabaseAdmin(): SupabaseClient {
  if (globalForStorage._supabaseAdmin) return globalForStorage._supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Storage not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  const client = createClient(url, key, { auth: { persistSession: false } });
  globalForStorage._supabaseAdmin = client;
  return client;
}

/** Create the attachments bucket on first use; idempotent (ignores "already exists"). */
export async function ensureBucket(): Promise<void> {
  if (globalForStorage._bucketEnsured) return;
  const { error } = await supabaseAdmin().storage.createBucket(ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: "50MB",
  });
  // 409 / "already exists" is the expected steady state.
  if (error && !/exist/i.test(error.message)) throw error;
  globalForStorage._bucketEnsured = true;
}

/** A signed URL the browser can PUT a file to directly (bypasses our function body limit). */
export async function createSignedUpload(path: string) {
  await ensureBucket();
  const { data, error } = await supabaseAdmin()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("Failed to create signed upload URL");
  return data; // { signedUrl, token, path }
}

/** A short-lived signed URL to download/view an object. */
export async function createSignedDownload(path: string, expiresInSeconds = 60 * 60) {
  const { data, error } = await supabaseAdmin()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds, { download: false });
  if (error || !data) throw error ?? new Error("Failed to create signed download URL");
  return data.signedUrl;
}

export async function removeObject(path: string) {
  const { error } = await supabaseAdmin().storage.from(ATTACHMENTS_BUCKET).remove([path]);
  if (error) throw error;
}
