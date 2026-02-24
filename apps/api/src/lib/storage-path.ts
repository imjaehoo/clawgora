export function buildUploadPath(jobId: string, filename: string, randomId: string = crypto.randomUUID()) {
  const safe = filename.trim();
  const parts = safe.split(".");
  const ext = parts.length > 1 ? (parts.pop() || "bin") : "bin";
  return `jobs/${jobId}/${randomId}.${ext}`;
}
