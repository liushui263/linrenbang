import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import MyFavorites from "@/components/MyFavorites";
import RecommenderImpact from "@/components/RecommenderImpact";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "我的", robots: { index: false } };

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");
  const admin = createAdminClient();
  const [{ data: provider }, { data: recs }] = await Promise.all([
    admin.from("providers").select("id, name, status").eq("owner_user_id", user.id).maybeSingle(),
    admin
      .from("recommendations")
      .select("id, status, provider_id, providers(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold">我的</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      <MyFavorites userId={user.id} />

      <section className="rounded-2xl bg-white p-4">
        <h2 className="font-semibold">我的店</h2>
        {provider ? (
          <Link href="/merchant" className="mt-2 block text-emerald-700 underline">
            {provider.name}（管理名片）
          </Link>
        ) : (
          <div className="mt-2 flex gap-4 text-sm">
            <Link href="/merchant/register" className="text-emerald-700 underline">
              免费注册商家
            </Link>
            <Link href="/merchant/claim" className="text-emerald-700 underline">
              认领已有的店
            </Link>
          </div>
        )}
      </section>

      {/* 推荐有回音：自成一块 */}
      <RecommenderImpact userId={user.id} />

      <section className="rounded-2xl bg-white p-4">
        <h2 className="font-semibold">我写的推荐</h2>
        {recs && recs.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm">
            {recs.map((r) => (
              <li key={r.id} className="flex justify-between">
                <Link href={`/provider/${r.provider_id}`} className="text-emerald-700 underline">
                  {(r.providers as unknown as { name: string } | null)?.name ?? "商家"}
                </Link>
                <span className="text-gray-400">{r.status === "pending" ? "待审核" : r.status === "active" ? "已展示" : "已隐藏"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">还没写过推荐。</p>
        )}
      </section>

      {isAdmin(user.id) && (
        <Link href="/admin" className="block rounded-2xl bg-gray-900 p-4 text-center text-white">
          站长审核后台
        </Link>
      )}

      <form action={signOut}>
        <button className="w-full rounded-xl border border-gray-300 py-3 text-gray-600">退出登录</button>
      </form>
    </div>
  );
}
