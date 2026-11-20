"use client";

import { useState } from "react";
import { CONTACT_METHODS, SMS_GREETING, type ContactMethod } from "@/constants/site";
import { formatUsPhone } from "@/lib/phone";
import { trackProviderEvent } from "@/lib/track";

interface Props {
  providerId: string;
  methods?: ContactMethod[];
  pref?: ContactMethod;
  hasWechat: boolean;
  paused: boolean;
  /** 列表里的紧凑版：按钮矮一点 */
  compact?: boolean;
}

type Contact = { phone: string | null; wechat_id: string | null };

/**
 * 13.6：电话和微信不在 HTML 里，点按钮才从接口取。
 * v3.4：商家选的联系方式（打电话 / 发短信 / 加微信），偏好的那个排第一、实心高亮。
 */
export default function ContactButtons({ providerId, methods = ["phone", "sms"], pref = "phone", hasWechat, paused, compact }: Props) {
  const py = compact ? "py-2" : "py-3";
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState<ContactMethod | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [wechatBox, setWechatBox] = useState<string | null>(null);
  const [nowPaused, setNowPaused] = useState(paused);

  const shown = CONTACT_METHODS.filter((m) => methods.includes(m.id) && (m.id !== "wechat" || hasWechat));
  const ordered = [...shown.filter((m) => m.id === pref), ...shown.filter((m) => m.id !== pref)];
  const prefLabel = shown.length > 1 ? shown.find((m) => m.id === pref)?.pref : null;

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
    setLoading("phone");
    const c = await fetchContact();
    setLoading(null);
    if (!c?.phone) return;
    trackProviderEvent(providerId, "call");
    window.location.href = `tel:${c.phone}`;
  }

  async function onSms() {
    setLoading("sms");
    const c = await fetchContact();
    setLoading(null);
    // “?&body=” 这种写法 iPhone 和安卓都认
    if (c?.phone) window.location.href = `sms:${c.phone}?&body=${encodeURIComponent(SMS_GREETING)}`;
  }

  async function onWechat() {
    setLoading("wechat");
    const c = await fetchContact();
    setLoading(null);
    if (!c?.wechat_id) return;
    trackProviderEvent(providerId, "wechat");
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
        className={`w-full rounded-xl bg-gray-200 ${py} text-sm font-medium text-gray-500`}
        aria-disabled="true"
      >
        近期排期已满 · 暂不接单
      </button>
    );
  }

  const handlers: Record<ContactMethod, () => void> = { phone: onCall, sms: onSms, wechat: onWechat };
  const labels: Record<ContactMethod, string> = { phone: "一键拨号", sms: "发短信", wechat: "复制微信" };
  const revealed = [
    contact?.phone && `电话 ${formatUsPhone(contact.phone)}`,
    contact?.wechat_id && `微信 ${contact.wechat_id}`,
  ].filter(Boolean);

  return (
    <div className="relative">
      {prefLabel && <p className="mb-1.5 text-xs font-medium text-emerald-700">★ {prefLabel}</p>}
      <div className="flex gap-2">
        {ordered.map((m) => {
          const primary = m.id === pref || ordered.length === 1;
          return (
            <button
              key={m.id}
              onClick={handlers[m.id]}
              disabled={loading !== null}
              className={`flex-1 rounded-xl ${py} text-sm font-medium disabled:opacity-60 ${
                primary
                  ? "bg-emerald-600 text-white active:bg-emerald-700"
                  : "border border-emerald-600 text-emerald-700 active:bg-emerald-50"
              }`}
            >
              {loading === m.id ? "获取中…" : labels[m.id]}
            </button>
          );
        })}
      </div>
      {revealed.length > 0 && <p className="mt-1.5 text-center text-xs text-gray-500">{revealed.join(" · ")}</p>}

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
