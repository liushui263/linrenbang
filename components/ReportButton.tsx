"use client";

import { useState, useTransition } from "react";
import { createReport } from "@/app/actions/report";

export default function ReportButton({ targetType, targetId }: { targetType: "provider" | "recommendation"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (msg) return <span className="text-xs text-gray-400">{msg}</span>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-gray-400 underline">
        {targetType === "provider" ? "举报 / 纠错" : "举报"}
      </button>
    );
  return (
    <div className="mt-2 w-full space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="哪里不对？例如：电话打不通、已停业、推荐是刷的"
        className="w-full rounded-lg border border-gray-300 p-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createReport(targetType, targetId, reason);
              setMsg(res.ok ? "已收到，站长 24 小时内处理" : res.error ?? "出错了");
            })
          }
          className="rounded-lg bg-gray-800 px-3 py-1 text-xs text-white"
        >
          提交
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500">
          取消
        </button>
      </div>
    </div>
  );
}
