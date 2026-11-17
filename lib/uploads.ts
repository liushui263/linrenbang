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
  if (!ext) return { error: "图片只支持 JPG / PNG / WebP（iPhone 的 HEIC 请先截图或转成 JPG）" };
  const path = `${ownerId}/${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[uploadImage]", bucket, error.message);
    return { error: "图片上传失败，请稍后再试，或者先不传图片" };
  }
  if (bucket === "avatars") return { value: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl };
  return { value: path };
}

/** 删掉旧图片（换图或删图时调用）。只删本人目录下的文件；失败不影响保存 */
export async function removeImage(value: string | null | undefined, bucket: "avatars" | "licenses", ownerId: string) {
  if (!value) return;
  // 头像存的是公开 URL，执照存的是存储路径
  const path = bucket === "avatars" ? value.split("/storage/v1/object/public/avatars/")[1] : value;
  if (!path || !path.startsWith(`${ownerId}/`)) return;
  const { error } = await createAdminClient().storage.from(bucket).remove([path]);
  if (error) console.error("[removeImage]", bucket, error.message);
}
