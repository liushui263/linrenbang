"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { saveZip } from "@/app/actions/location";

const LS_KEY = "lrb_zip";

interface Props {
  open: boolean; // 服务端判断：首次访问（没有 cookie）时为 true
  currentZip: string | null;
  onClose?: () => void;
  restore?: boolean; // 首次提示时：cookie 丢了但 localStorage 还有，就静默恢复
}

/** 第 2 节：首次打开全屏轻提示，输入 5 位 Zip；可跳过，跳过默认休斯顿。不用定位权限。 */
export default function ZipGate({ open, currentZip, onClose, restore = false }: Props) {
  const [visible, setVisible] = useState(open);
  const [zip, setZip] = useState(currentZip ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => setVisible(open), [open]);

  // 游客 cookie 丢了但 localStorage 还在：静默恢复，不再打扰
  useEffect(() => {
    if (!restore) return;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved !== null) {
        start(async () => {
          const res = await saveZip(saved === "" ? null : saved);
          if (res.ok) window.location.reload();
        });
      }
    } catch {
      /* localStorage 不可用就算了 */
    }
  }, [restore]);

  function submit(value: string | null) {
    setError(null);
    start(async () => {
      const res = await saveZip(value);
      if (!res.ok) {
        setError(res.error ?? "出错了");
        return;
      }
      try {
        localStorage.setItem(LS_KEY, value ?? "");
      } catch {
        /* ignore */
      }
      setVisible(false);
      onClose?.();
      // 城市变了，整页重新加载最稳（列表、分类、轮换都跟着切）
      window.location.reload();
    });
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 弹窗打开时锁住背后页面的滚动
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible || !mounted) return null;

  // 必须挂到 <body> 上：顶部栏有 backdrop-blur，会让里面的 position:fixed 只盖住顶部栏那一条
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zip-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white px-6 py-8 text-center shadow-2xl">
        <div className="text-4xl">🏘️</div>
        <h2 id="zip-gate-title" className="mt-3 text-xl font-bold text-gray-900">输入你的 Zip Code</h2>
        <p className="mt-2 text-sm text-gray-600">看看你附近的邻居推荐了谁</p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(zip.trim());
          }}
        >
          <input
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            autoFocus
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            placeholder="例如 77077"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            disabled={pending || zip.length !== 5}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            确定
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={() => {
            if (onClose) {
              setVisible(false);
              onClose();
            } else {
              submit(null);
            }
          }}
          className="mt-4 text-sm text-gray-500 underline"
        >
          {onClose ? "取消" : "跳过，先看休斯顿"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
