import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_PROVIDER_COLUMNS, type PublicProvider } from "@/lib/types";
import ProviderCard from "./ProviderCard";

/** “我的”页面里的“我的师傅”：收藏过的师傅，最近收藏的在前；下架的不显示 */
export default async function MyFavorites({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: favs } = await supabase
    .from("favorites")
    .select("provider_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const ids = (favs ?? []).map((f) => f.provider_id as string);

  let providers: PublicProvider[] = [];
  if (ids.length > 0) {
    // providers 的公开读策略只放出 active / paused，下架或待审核的自动不显示
    const { data } = await supabase.from("providers").select(PUBLIC_PROVIDER_COLUMNS).in("id", ids);
    const byId = new Map(((data ?? []) as unknown as PublicProvider[]).map((p) => [p.id, p]));
    providers = ids.map((id) => byId.get(id)).filter((p): p is PublicProvider => !!p);
  }

  return (
    <section id="favorites" className="scroll-mt-16">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-semibold">我的师傅{providers.length > 0 && <span className="ml-1 text-gray-400">（{providers.length}）</span>}</h2>
      </div>
      {providers.length > 0 ? (
        <ul className="space-y-3">
          {providers.map((p) => (
            <li key={p.id}>
              <ProviderCard provider={p} favorited />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl bg-white p-4 text-sm text-gray-500">
          还没有收藏的师傅。看到用过的、想用的师傅，点名片右上角的“☆ 收藏”，下次在这里直接拨号。
          <Link href="/" className="mt-2 block text-emerald-700 underline">
            去找师傅
          </Link>
        </div>
      )}
    </section>
  );
}
