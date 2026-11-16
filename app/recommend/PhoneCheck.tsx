"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 7.2 第一步：电话查重。已存在 → 跳详情页写推荐；不存在 → 填新商家 + 推荐 */
export default function PhoneCheck() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/phone-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setMsg("电话格式不对，请填 10 位美国号码");
    if (json.exists && json.providerId) return router.push(`/recommend?provider=${json.providerId}`);
    if (json.exists) return setMsg("这个电话已经有人登记了，正在等站长审核，过一两天再来推荐吧。");
    router.push(`/recommend?new=1&phone=${encodeURIComponent(phone)}`);
  }

  return (
    <form onSubmit={check} className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">师傅/商家的电话</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        required
        placeholder="(713) 555-0123"
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
      />
      <button disabled={loading} className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-60">
        {loading ? "查询中…" : "下一步"}
      </button>
      {msg && <p className="text-sm text-amber-700">{msg}</p>}
    </form>
  );
}
