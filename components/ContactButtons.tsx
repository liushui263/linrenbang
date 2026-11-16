"use client";

import { useState } from "react";
import { formatUsPhone } from "@/lib/phone";

interface Props {
  providerId: string;
  hasWechat: boolean;
  paused: boolean;
}

type Contact = { phone: string; wechat_id: string | null };

/** 13.6：电话和微信不在 HTML 里，点按钮才从接口取 */
export default function ContactButtons({ providerId, hasWechat, paused }: Props) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState<"call" | "wechat" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [wechatBox, setWechatBox] = useState<string | null>(null);
  const [nowPaused, setNowPaused] = useState(paused);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  async function fetchContact(): Promise<Contact | null> {
    if (contact) return contact;
    const res = await fetch(`/api/providers/${providerId}/contact`, { cache: "no-store" });
    if (res.status === 429) {
      flash("操作太频繁，请稍后再试");
      return null;
    }
    if (!res.ok) {
      flash("暂时取不到联系方式，请稍后再试");
      return null;
    }
    const json = await res.json();
    if (json.paused) {
      setNowPaused(true);
      return null;
    }
    setContact(json);
    return json;
  }

  async function onCall() {
    setLoading("call");
    const c = await fetchContact();
    setLoading(null);
    if (c?.phone) window.location.href = `tel:${c.phone}`;
  }

  async function onWechat() {
    setLoading("wechat");
    const c = await fetchContact();
    setLoading(null);
    if (!c?.wechat_id) return;
    try {
      await navigator.clipboard.writeText(c.wechat_id);
      flash(`已复制微信号：${c.wechat_id}`);
    } catch {
      // 微信内置浏览器、iOS Safari 常拒绝异步复制：弹小框让用户再点一次
      setWechatBox(c.wechat_id);
    }
  }

  async function copyFromBox() {
    if (!wechatBox) return;
    try {
      await navigator.clipboard.writeText(wechatBox);
      flash(`已复制微信号：${wechatBox}`);
      setWechatBox(null);
    } catch {
      flash("请长按微信号手动复制");
    }
  }

  if (nowPaused) {
    return (
      <button
        disabled
        className="w-full rounded-xl bg-gray-200 py-3 text-sm font-medium text-gray-500"
        aria-disabled="true"
      >
        近期排期已满 · 暂不接单
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        {hasWechat && (
          <button
            onClick={onWechat}
            disabled={loading !== null}
            className="flex-1 rounded-xl border border-emerald-600 py-3 text-sm font-medium text-emerald-700 active:bg-emerald-50 disabled:opacity-60"
          >
            {loading === "wechat" ? "获取中…" : contact?.wechat_id ? `微信：${contact.wechat_id}` : "复制微信"}
          </button>
        )}
        <button
          onClick={onCall}
          disabled={loading !== null}
          className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white active:bg-emerald-700 disabled:opacity-60"
        >
          {loading === "call" ? "获取中…" : contact ? `拨打 ${formatUsPhone(contact.phone)}` : "一键拨号"}
        </button>
      </div>

      {wechatBox && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-sm">
          <span className="flex-1 select-all font-mono">{wechatBox}</span>
          <button onClick={copyFromBox} className="rounded-lg bg-emerald-600 px-3 py-1 text-white">
            复制
          </button>
          <button onClick={() => setWechatBox(null)} className="px-1 text-gray-400" aria-label="关闭">
            ✕
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-black/80 px-4 py-2 text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
