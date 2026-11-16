"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-60">
      {pending ? "提交中…" : children}
    </button>
  );
}
