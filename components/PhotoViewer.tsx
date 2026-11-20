"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  src: string;
  alt: string;
  className?: string;
}

/** 点头像在站内放大看，不跳到存储原图的新标签页；点背景、✕ 或按 Esc 关闭 */
export default function PhotoViewer({ src, alt, className }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="shrink-0 cursor-zoom-in" title="点开看大图" aria-label={`看大图：${alt}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      {open &&
        // 挂到 <body>：外层的悬浮栏/模糊背景会让 fixed 定位失效
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
            >
              ✕
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
