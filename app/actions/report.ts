"use server";

import { dbErrorMessage, ensureUserRow, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createReport(
  targetType: "provider" | "recommendation",
  targetId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const text = reason.trim();
  if (!/^[0-9a-f-]{36}$/i.test(targetId)) return { ok: false, error: "参数不对" };
  if (text.length < 2 || text.length > 300) return { ok: false, error: "请写清楚原因（300 字内）" };
  const user = await getCurrentUser().catch(() => null);
  if (user) await ensureUserRow(user);
  const { error } = await createAdminClient()
    .from("reports")
    .insert({ target_type: targetType, target_id: targetId, reason: text, reporter_user_id: user?.id ?? null });
  return error ? { ok: false, error: dbErrorMessage("createReport", error) } : { ok: true };
}
