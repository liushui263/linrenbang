"use client";

import { useState } from "react";

export default function CopyLinkButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* ignore */
        }
      }}
      className="text-sm text-emerald-700 underline"
    >
      {done ? "链接已复制，发到群里吧" : "复制链接，转发到微信群"}
    </button>
  );
}
