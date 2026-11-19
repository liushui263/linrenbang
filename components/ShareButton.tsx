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
/**
 * lines：放在链接前面的几行文字（店名、服务、技能标签），复制和系统分享都带上
 */
export default function ShareButton({
  path,
  title,
  lines = [],
  what = "名片",
  label = "分享",
  heading,
  copyLabel,
  className,
}: {
  path: string;
  title: string;
  lines?: string[];
  /** 分享的是什么：“名片”“提醒”…，用在按钮和弹窗文字里 */
  what?: string;
  /** 按钮文字 */
  label?: string;
  /** 弹出菜单的标题（默认“分享这张{what}”） */
  heading?: string;
  /** 复制按钮文字（默认“复制{what}，发微信”） */
  copyLabel?: string;
  /** 换掉默认的小圆角按钮样式 */
  className?: string;
}) {
  const dialogTitle = heading ?? `分享这张${what}`;
  const copyText_ = copyLabel ?? `复制${what}，发微信`;
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

  const shareText = [...lines, url].join("\n");

  async function onCopy() {
    const ok = await copyText(shareText);
    setCopied(ok ? "ok" : "fail");
  }

  async function onNativeShare() {
    // 先复制一份：如果选了微信又报 unable to share，回到微信直接粘贴就行
    // 两个都在点击当下发起（不先 await），否则 Safari 会认为不是用户操作而拒绝分享
    void copyText(shareText).then((ok) => ok && setCopied("ok"));
    try {
      // 只传一段文字（链接放在文字里），不传 url 字段：iPhone 上微信收不了系统分享过来的网址
      await navigator.share({ title, text: shareText });
      setOpen(false);
    } catch {
      /* 用户取消，或这个 App 不支持，留在菜单里可以改用复制 */
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
        className={
          className ??
          "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 active:bg-emerald-100"
        }
        aria-label={dialogTitle}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3v12M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
        </svg>
        {label}
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
            aria-label={dialogTitle}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{dialogTitle}</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400" aria-label="关闭">
                ✕
              </button>
            </div>
            <p className="whitespace-pre-wrap break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{shareText}</p>
            <button type="button" onClick={onCopy} className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white">
              {copied === "ok" ? "✓ 已复制，去微信粘贴吧" : copyText_}
            </button>
            {copied === "fail" && <p className="text-sm text-red-600">没复制成功，请长按上面的文字手动复制</p>}
            <p className="text-sm text-gray-600">
              <span className="font-medium">发微信：</span>点上面的按钮复制，打开微信群或聊天，长按输入框粘贴发送。iPhone 的系统分享直接选微信会报错，请用复制粘贴。
            </p>
            {canNativeShare && (
              <button
                type="button"
                onClick={onNativeShare}
                className="w-full rounded-xl border border-gray-300 py-3 text-gray-700"
              >
                发短信、邮件等（不适用于微信）
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
