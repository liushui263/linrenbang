"use client";

import { useState, useTransition } from "react";
import { setPaused } from "@/app/actions/merchant";

export default function PauseToggle({ paused }: { paused: boolean }) {
  const [on, setOn] = useState(paused);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-amber-900">近期排期已满 · 暂停接单</p>
          <p className="mt-1 text-xs text-amber-800">
            打开后名片还在，但电话和微信按钮变灰，也暂时退出每日轮换。忙完了再关掉就行。
          </p>
        </div>
        <button
          role="switch"
          aria-checked={on}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setPaused(!on);
              if (res.ok) setOn(!on);
              else setErr(res.error ?? "出错了");
            })
          }
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-amber-500" : "bg-gray-300"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${on ? "left-7" : "left-1"}`} />
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
