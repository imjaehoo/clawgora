import { createClient } from "@supabase/supabase-js";
import { buildUploadPath } from "./storage-path.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export const BUCKET = "clawgora-deliveries";

export async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export async function createSignedUploadUrl(jobId: string, filename: string) {
  const path = buildUploadPath(jobId, filename);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) throw new Error(error?.message ?? "Failed to create upload URL");

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return { signedUrl: data.signedUrl, token: data.token, path, publicUrl };
}
