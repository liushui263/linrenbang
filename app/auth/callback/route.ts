import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/nav";
import { ensureUserRow } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const EMAIL_LINK_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

/**
 * 两种回来的方式：
 * 1. Google / Apple 等 OAuth：?code=...（PKCE，需要在同一个浏览器里完成）
 * 2. 邮件里的登录链接：?token_hash=...&type=email（不依赖浏览器 cookie，
 *    在微信里点开、换个浏览器打开都能用）。邮件模板写法见 docs/邮箱登录设置.md
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) await ensureUserRow(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type && EMAIL_LINK_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      if (data.user) await ensureUserRow(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=1&next=${encodeURIComponent(next)}`);
}
