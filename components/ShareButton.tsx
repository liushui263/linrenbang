"use client";

import { useEffect, useState } from "react";

/** 复制文字：先用新接口，不行（比如微信里、老系统）再用老办法 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * 名片左上角的“分享”按钮。
 * - 在微信里打开：提示点右上角 ··· 发给朋友 / 朋友圈（微信自己的分享最好用）
 * - 其他浏览器：弹出小菜单，“复制链接”（发微信用这个，iPhone 系统分享到微信常会报 unable to share）
 *   和“更多分享方式”（系统分享：短信、邮件等）
 */
export default function ShareButton({ path, title }: { path: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [inWechat, setInWechat] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState<null | "ok" | "fail">(null);
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setInWechat(/MicroMessenger/i.test(navigator.userAgent));
    setCanNativeShare(typeof navigator.share === "function");
    setUrl(new URL(path, window.location.origin).toString());
  }, [path]);

  async function onCopy() {
    const ok = await copyText(url);
    setCopied(ok ? "ok" : "fail");
  }

  async function onNativeShare() {
    try {
      // 只传标题和链接：带上大段文字时，有些 App（包括微信）接不住
      await navigator.share({ title, url });
      setOpen(false);
    } catch {
      /* 用户取消，或这个 App 不支持，留在菜单里可以改用复制链接 */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCopied(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 active:bg-emerald-100"
        aria-label="分享这张名片"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3v12M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
        </svg>
        分享
      </button>

      {open && inWechat && (
        // 微信里：遮罩 + 指向右上角的提示
        <div className="fixed inset-0 z-50 bg-black/70" onClick={() => setOpen(false)}>
          <div className="absolute right-4 top-2 text-right text-white">
            <div className="mr-2 text-4xl leading-none">↗</div>
            <p className="mt-2 text-lg font-semibold">点右上角 ··· </p>
            <p className="mt-1 text-base">选“发送给朋友”或“分享到朋友圈”</p>
            <p className="mt-6 text-sm text-white/70">点任意处关闭</p>
          </div>
        </div>
      )}

      {open && !inWechat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm space-y-3 rounded-t-2xl bg-white p-5 pb-8 sm:rounded-2xl sm:pb-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="分享名片"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">分享这张名片</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400" aria-label="关闭">
                ✕
              </button>
            </div>
            <p className="break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">{url}</p>
            <button type="button" onClick={onCopy} className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white">
              {copied === "ok" ? "✓ 链接已复制" : "复制链接"}
            </button>
            {copied === "fail" && <p className="text-sm text-red-600">没复制成功，请长按上面的链接手动复制</p>}
            <p className="text-sm text-gray-600">
              <span className="font-medium">发微信：</span>复制链接后，打开微信群或聊天，粘贴发送即可。
            </p>
            {canNativeShare && (
              <button
                type="button"
                onClick={onNativeShare}
                className="w-full rounded-xl border border-gray-300 py-3 text-gray-700"
              >
                更多分享方式（短信、邮件等）
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
