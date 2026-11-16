"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** 13.5：只开 Google；手机号和微信登录灰显“暂不支持” */
export default function LoginButtons({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function google() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError("Google 登录暂时不可用，请稍后再试");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={google}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 font-medium text-gray-800 active:bg-gray-50 disabled:opacity-60"
      >
        <span className="text-lg font-bold text-blue-600">G</span>
        {loading ? "正在跳转…" : "Google 登录"}
      </button>
      <button disabled aria-disabled="true" className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-gray-400">
        <span>📱 手机号验证码登录</span>
        <span className="text-xs">暂不支持</span>
      </button>
      <button disabled aria-disabled="true" className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-gray-400">
        <span>💬 微信登录</span>
        <span className="text-xs">暂不支持</span>
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
