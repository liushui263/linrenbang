"use client";

import Link from "next/link";
import { createContext, useActionState, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import type { FormState } from "@/app/actions/recommend";
import { validateField, type FieldErrors } from "@/lib/validate";

interface Ctx {
  errors: FieldErrors;
  links: NonNullable<NonNullable<FormState>["fieldLinks"]>;
  pending: boolean;
  /** 图片组件把处理好（压缩/裁剪）的图片登记到这里，提交时替换原文件 */
  setFile: (name: string, file: Blob | null) => void;
}
const FormCtx = createContext<Ctx>({ errors: {}, links: {}, pending: false, setFile: () => {} });
export const useActionForm = () => useContext(FormCtx);

/** 显示某个字段的错误（放在对应输入框下面） */
export function FieldError({ name }: { name: string }) {
  const { errors, links } = useActionForm();
  if (!errors[name]) return null;
  const link = links[name];
  return (
    <p className="mt-1 text-sm text-red-600">
      {errors[name]}
      {link && (
        <>
          {" "}
          <Link href={link.href} className="font-medium text-emerald-700 underline">
            {link.label} →
          </Link>
        </>
      )}
    </p>
  );
}

/**
 * 统一的表单外壳：
 * - 手动提交，出错时不清空已填内容
 * - 离开输入框时即时校验，提交前全量校验，错误显示在对应字段下面
 * - 服务端返回的字段错误也显示在对应字段下面，并滚动到第一个错误
 */
export default function ActionForm({
  action,
  children,
  hideOnSuccess = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  hideOnSuccess?: boolean;
}) {
  const [state, formAction, actionPending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  // 上次提交的内容：服务端报的错（如电话已登记）在用户没改这个字段之前一直保留
  const submitted = useRef<FormData | null>(null);
  const filesRef = useRef<Record<string, Blob | null>>({});
  const setFile = useCallback((name: string, file: Blob | null) => {
    filesRef.current[name] = file;
  }, []);

  const fieldNames = () => {
    const form = formRef.current;
    if (!form) return [];
    return Array.from(new Set(Array.from(form.elements).map((el) => (el as HTMLInputElement).name).filter(Boolean)));
  };

  const scrollToFirst = (errs: FieldErrors) => {
    const first = fieldNames().find((n) => errs[n]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  // 服务端返回字段错误时显示出来
  useEffect(() => {
    if (state?.fieldErrors && Object.keys(state.fieldErrors).length) {
      setErrors(state.fieldErrors);
      scrollToFirst(state.fieldErrors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function revalidate(name: string) {
    if (!name || !formRef.current) return;
    const fd = new FormData(formRef.current);
    let msg = validateField(name, fd);
    const serverMsg = state?.fieldErrors?.[name];
    if (!msg && serverMsg && submitted.current && String(submitted.current.get(name) ?? "") === String(fd.get(name) ?? "")) {
      msg = serverMsg;
    }
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[name] = msg;
      else delete next[name];
      return next;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const [name, file] of Object.entries(filesRef.current)) {
      if (file) fd.set(name, file, `${name}.jpg`);
    }
    const errs: FieldErrors = {};
    for (const n of fieldNames()) {
      const msg = validateField(n, fd);
      if (msg) errs[n] = msg;
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      scrollToFirst(errs);
      return;
    }
    submitted.current = fd;
    // 手动调用，不会像 <form action> 那样在提交后清空表单
    startTransition(() => formAction(fd));
  }

  if (hideOnSuccess && state?.ok) return <p className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{state.ok}</p>;

  const errorCount = Object.keys(errors).length;
  return (
    <FormCtx.Provider value={{ errors, links: state?.fieldLinks ?? {}, pending: actionPending, setFile }}>
      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        onBlur={(e) => revalidate((e.target as unknown as HTMLInputElement).name)}
        onChange={(e) => {
          const t = e.target as unknown as HTMLInputElement;
          // 已经报错的字段，改对了马上消掉；勾选框、下拉框改了就校验
          if (errors[t.name] || t.type === "checkbox" || t.tagName === "SELECT") revalidate(t.name);
        }}
        className="space-y-4"
      >
        {children}
        {errorCount > 0 && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">还有 {errorCount} 处需要改一下，见上面红字。</p>
        )}
        {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        {state?.ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.ok}</p>}
      </form>
    </FormCtx.Provider>
  );
}
