"use client";

import { useActionForm } from "./ActionForm";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useActionForm();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-60">
      {pending ? "提交中…" : children}
    </button>
  );
}
