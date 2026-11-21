import { NextResponse, type NextRequest } from "next/server";
import { ANON_CLAIM_COOKIE, readClaimTokens } from "@/lib/anon-recommend";
import { hashClaimToken } from "@/lib/anon-server";
import { ensureUserRow, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 认领匿名推荐：登录后打开这个地址，把这个浏览器里匿名提交过的推荐认到自己名下。
 * 认领后这条推荐就算“登录邻居的推荐”，名片上的“匿名推荐”小标志随之消失。
 * 已经用这个账号推荐过同一位师傅的，跳过那一条（一人一商家一条）。
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent("/recommend/claim")}`);
  await ensureUserRow(user);

  const tokens = readClaimTokens(req.cookies.get(ANON_CLAIM_COOKIE)?.value);
  let claimed = 0;
  if (tokens.length) {
    const admin = createAdminClient();
    const { data: recs } = await admin
      .from("recommendations")
      .select("id, provider_id")
      .in("claim_token_hash", tokens.map(hashClaimToken))
      .is("user_id", null);
    for (const r of recs ?? []) {
      const { error } = await admin
        .from("recommendations")
        .update({ user_id: user.id, claim_token_hash: null })
        .eq("id", r.id)
        .is("user_id", null);
      if (error) continue; // 23505：这个账号已经推荐过这位师傅
      claimed++;
      // 邻居匿名代录入的新商家：记上是谁提交的
      await admin
        .from("providers")
        .update({ submitted_by_user_id: user.id })
        .eq("id", r.provider_id)
        .eq("source", "neighbor_anonymous")
        .is("submitted_by_user_id", null);
    }
  }
  const res = NextResponse.redirect(`${origin}/me?claimed=${claimed}`);
  res.cookies.delete(ANON_CLAIM_COOKIE);
  return res;
}
