"use client";

import { useState, useTransition } from "react";
import { joinWaitlist } from "@/app/actions/location";

export default function WaitlistForm({ zip, onClose }: { zip: string; onClose?: () => void }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done)
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm text-emerald-700">好的，开通后第一时间通知你。</p>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">
            知道了
          </button>
        )}
      </div>
    );
  return (
    <form
      className="mt-2 flex flex-wrap gap-2"
      action={(fd) =>
        start(async () => {
          const res = await joinWaitlist(fd);
          if (res.ok) setDone(true);
          else setError(res.error ?? "出错了");
        })
      }
    >
      <input type="hidden" name="zip" value={zip} />
      <input
        name="email"
        type="email"
        required
        placeholder="你的邮箱"
        className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
      />
      <button disabled={pending} className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-60">
        通知我
      </button>
      {error && <span className="w-full text-sm text-red-600">{error}</span>}
    </form>
  );
}
