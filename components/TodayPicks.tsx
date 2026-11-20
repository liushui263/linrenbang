"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { TODAY_PICKS, TODAY_SCROLL_MS } from "@/constants/site";

/**
 * “今日邻人推荐”的名片列表：最多显示 6 张；多于 6 张时每 10 秒滚动一张
 * （最上面一张移到最后，下一张从下面补进来）。
 * 所有名片都已经在 HTML 里，只是切换显示，不会重新请求。
 * 用户点、按、聚焦到列表时暂停 30 秒，免得正要拨号时名片跑了；系统设置了“减少动态效果”就不自动滚。
 */
export default function TodayPicks({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const n = items.length;
  const scrolls = n > TODAY_PICKS;
  const [offset, setOffset] = useState(0);
  const pausedUntil = useRef(0);

  useEffect(() => {
    if (!scrolls) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.hidden || Date.now() < pausedUntil.current) return;
      setOffset((o) => (o + 1) % n);
    }, TODAY_SCROLL_MS);
    return () => window.clearInterval(id);
  }, [scrolls, n]);

  if (!scrolls) return <div className="space-y-3">{items}</div>;

  const pause = () => {
    pausedUntil.current = Date.now() + 30_000;
  };
  // 第 k 张在当前窗口里的位置（0..n-1），小于 6 的显示
  const slot = (k: number) => (k - offset + n) % n;

  return (
    <div onPointerDown={pause} onFocusCapture={pause}>
      <div className="flex flex-col gap-3">
        {items.map((item, k) => {
          const s = slot(k);
          return (
            <div
              key={k}
              style={{ order: s }}
              className={s < TODAY_PICKS ? (s === TODAY_PICKS - 1 && offset > 0 ? "today-pick-in" : undefined) : "hidden"}
              aria-hidden={s >= TODAY_PICKS || undefined}
            >
              {item}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>
          共 {n} 位 · 每 {TODAY_SCROLL_MS / 1000} 秒换一位
        </span>
        <button
          type="button"
          onClick={() => {
            pause();
            setOffset((o) => (o + 1) % n);
          }}
          className="rounded-full px-2 py-1 font-medium text-emerald-700 active:bg-emerald-50"
        >
          下一位 ›
        </button>
      </div>
    </div>
  );
}
