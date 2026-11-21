import type { Metadata } from "next";
import { safeNext } from "@/lib/nav";
import LoginButtons from "./LoginButtons";

export const metadata: Metadata = { title: "登录", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-bold text-gray-900">登录邻人帮</h1>
      <p className="mt-2 text-sm text-gray-600">注册商家、认领店铺需要先登录。推荐师傅、看推荐和打电话都不用登录。</p>
      {sp.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">登录没有成功，请再试一次。</p>}
      <div className="mt-6">
        <LoginButtons next={safeNext(sp.next)} />
      </div>
    </div>
  );
}
