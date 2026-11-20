"use client";

import { useState, type ReactNode } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import EmailCodeLogin from "./EmailCodeLogin";

/**
 * 登录方式都列在这里。以后加一种第三方登录（比如 Apple），只要：
 * 1. Supabase 后台 Authentication → Providers 打开它；
 * 2. 在下面 OAUTH_PROVIDERS 里加一行（或把 enabled 打开）。
 * 回调统一走 /auth/callback，不用改别处。
 */
type OAuthOption = {
  id: Provider;
  label: string;
  icon: ReactNode;
  className: string;
  enabled: boolean;
};

const OAUTH_PROVIDERS: OAuthOption[] = [
  {
    id: "google",
    label: "Google 登录",
    icon: <span className="text-lg font-bold text-blue-600">G</span>,
    className: "border border-gray-300 bg-white text-gray-800 active:bg-gray-50",
    enabled: true,
  },
  {
    id: "apple",
    label: "通过 Apple 登录",
    icon: <AppleIcon />,
    className: "bg-black text-white active:bg-gray-800",
    // 在 Supabase 配好 Apple 后，在 Vercel 加环境变量 NEXT_PUBLIC_AUTH_APPLE=1 并重新部署即可出现
    enabled: process.env.NEXT_PUBLIC_AUTH_APPLE === "1",
  },
];

/** 还没开通的方式：灰显“暂不支持” */
const COMING_SOON = ["📱 手机号验证码登录", "💬 微信登录"];

export default function LoginButtons({ next }: { next: string }) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function oauth(p: OAuthOption) {
    setLoading(p.id);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: p.id,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(`${p.label}暂时不可用，请稍后再试，或用邮箱验证码登录`);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {OAUTH_PROVIDERS.filter((p) => p.enabled).map((p) => (
        <button
          key={p.id}
          onClick={() => oauth(p)}
          disabled={loading !== null}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium disabled:opacity-60 ${p.className}`}
        >
          {p.icon}
          {loading === p.id ? "正在跳转…" : p.label}
        </button>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 py-1 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        没有 Google 账号？用邮箱收验证码
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <EmailCodeLogin next={next} />

      <div className="space-y-2 pt-3">
        {COMING_SOON.map((label) => (
          <button
            key={label}
            disabled
            aria-disabled="true"
            className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-400"
          >
            <span>{label}</span>
            <span className="text-xs">暂不支持</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 384 512" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
