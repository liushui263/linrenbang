"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/recommend";

/** 包一层 useActionState，统一显示错误/成功提示 */
export default function ActionForm({
  action,
  children,
  hideOnSuccess = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  hideOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  if (hideOnSuccess && state?.ok) return <p className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{state.ok}</p>;
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.ok}</p>}
    </form>
  );
}
