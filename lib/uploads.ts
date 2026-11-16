import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** 上传头像（公开桶）或执照照片（私有桶）。返回头像的公开 URL 或执照的存储路径 */
export async function uploadImage(
  file: FormDataEntryValue | null,
  bucket: "avatars" | "licenses",
  ownerId: string,
): Promise<{ value?: string; error?: string }> {
  if (!file || typeof file === "string" || file.size === 0) return {};
  if (file.size > MAX_BYTES) return { error: "图片不能超过 5MB" };
  const ext = TYPES[file.type];
  if (!ext) return { error: "图片只支持 JPG / PNG / WebP" };
  const path = `${ownerId}/${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: "图片上传失败，请稍后再试" };
  if (bucket === "avatars") return { value: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl };
  return { value: path };
}
