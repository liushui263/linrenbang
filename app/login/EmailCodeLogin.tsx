"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { afterEmailLogin } from "@/app/actions/auth";

/** 要和 Supabase 后台 Authentication → Providers → Email → Email OTP Length 一致 */
const CODE_LENGTH = 6;
/** Supabase 默认同一邮箱 60 秒内只能发一次 */
const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 邮箱 6 位验证码登录，全程在这一页完成。
 * 不用“点邮件里的链接登录”作为主要方式：微信里点开链接常常是另一个浏览器，会登录失败。
 */
export default function EmailCodeLogin({ next }: { next: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) {
      setError("邮箱格式不对，请检查一下");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: addr,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) {
      setError(sendErrorMessage(error));
      return;
    }
    setEmail(addr);
    setCode("");
    setStep("code");
    setCooldown(RESEND_SECONDS);
  }

  async function verify(token: string) {
    if (busy) return;
    if (token.length !== CODE_LENGTH) {
      setError(`请输入邮件里的 ${CODE_LENGTH} 位数字`);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      setBusy(false);
      setError("验证码不对或已经过期。请核对邮件里最新的一封，或者重新发送");
      return;
    }
    await afterEmailLogin().catch(() => null);
    // 整页跳转，让服务端页面读到新的登录 cookie
    window.location.assign(next);
  }

  function onCodeChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) verify(digits);
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-2">
        <label htmlFor="login-email" className="sr-only">
          邮箱
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="你的邮箱，如 name@qq.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white active:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "正在发送…" : "✉️ 发送邮箱验证码"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verify(code);
      }}
      className="space-y-2 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100"
    >
      <p className="text-sm text-gray-700">
        验证码已发到 <b className="break-all">{email}</b>，请输入邮件里的 {CODE_LENGTH} 位数字：
      </p>
      <label htmlFor="login-code" className="sr-only">
        验证码
      </label>
      <input
        id="login-code"
        ref={codeRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={CODE_LENGTH}
        placeholder={"•".repeat(CODE_LENGTH)}
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      <button
        type="submit"
        disabled={busy || code.length !== CODE_LENGTH}
        className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white active:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "正在登录…" : "登录"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-between pt-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setError(null);
          }}
          className="text-gray-500 underline"
        >
          换个邮箱
        </button>
        <button
          type="button"
          disabled={busy || cooldown > 0}
          onClick={() => sendCode()}
          className="text-emerald-700 underline disabled:text-gray-400 disabled:no-underline"
        >
          {cooldown > 0 ? `${cooldown} 秒后可重新发送` : "重新发送"}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-gray-500">
        几分钟没收到？看看垃圾邮件，或 Gmail 的「推广」「社交」分类。发件人是邻人帮。
      </p>
    </form>
  );
}

function sendErrorMessage(error: { status?: number; message?: string; code?: string }): string {
  const msg = error.message ?? "";
  if (error.status === 429 || /rate limit|too many|security purposes/i.test(msg)) {
    return "发送太频繁了，请过一两分钟再试";
  }
  if (/signups? not allowed|disabled/i.test(msg)) {
    return "邮箱登录还没开通，请先用 Google 登录";
  }
  if (/invalid.*email|email.*invalid/i.test(msg)) {
    return "邮箱格式不对，请检查一下";
  }
  return "验证码发送失败，请稍后再试，或先用 Google 登录";
}
