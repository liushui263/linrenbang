import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import { providerCategoryLabel } from "@/constants/categories";
import { impactSentence, impactShareLines, impactWindowStart, type ImpactCounts } from "@/lib/impact";
import { createAdminClient } from "@/lib/supabase/admin";

type Row = {
  provider_id: string;
  providers: {
    id: string;
    name: string;
    status: string;
    category: string;
    categories: string[] | null;
    custom_service: string | null;
  } | null;
};

/**
 * “我的”页面：推荐有回音。
 * 对自己已展示的推荐，显示“你推荐的 XX，最近 7 天被 N 位邻居查看、M 位拨打”，并可一键转发到微信。
 * 自成一块，只需要 userId；数据表还没建好时整块不显示。
 */
export default async function RecommenderImpact({ userId }: { userId: string }) {
  const admin = createAdminClient();
  const { data: recs } = await admin
    .from("recommendations")
    .select("provider_id, providers(id, name, status, category, categories, custom_service)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const providers = ((recs ?? []) as unknown as Row[])
    .map((r) => r.providers)
    .filter((p): p is NonNullable<Row["providers"]> => !!p && (p.status === "active" || p.status === "paused"))
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  if (providers.length === 0) return null;

  const { data: counts, error } = await admin.rpc("provider_event_counts", {
    p_provider_ids: providers.map((p) => p.id),
    p_since: impactWindowStart(),
  });
  if (error) {
    // 0006 迁移还没运行：不显示这一块，也不影响“我的”页面其他部分
    console.error("[RecommenderImpact]", error.code, error.message);
    return null;
  }
  const byId = new Map<string, ImpactCounts>(
    ((counts ?? []) as { provider_id: string; views: number; calls: number; wechats: number }[]).map((c) => [
      c.provider_id,
      { views: Number(c.views), calls: Number(c.calls), wechats: Number(c.wechats) },
    ]),
  );
  const zero: ImpactCounts = { views: 0, calls: 0, wechats: 0 };
  const total = providers.reduce((s, p) => s + (byId.get(p.id)?.views ?? 0), 0);

  return (
    <section className="rounded-2xl bg-white p-4">
      <h2 className="font-semibold">我的推荐帮到了谁</h2>
      <p className="mt-1 text-xs text-gray-500">
        {total > 0 ? `最近 7 天，你的推荐一共被 ${total} 位邻居看到。谢谢你！` : "最近 7 天的邻居查看和联系次数（每人每天只算一次）"}
      </p>
      <ul className="mt-3 space-y-3">
        {providers.map((p) => {
          const c = byId.get(p.id) ?? zero;
          return (
            <li key={p.id} className="rounded-xl bg-emerald-50 p-3 text-sm">
              <p className="text-gray-800">{impactSentence(p.name, c)}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Link href={`/provider/${p.id}`} className="text-emerald-700 underline">
                  看名片
                </Link>
                <ShareButton
                  path={`/provider/${p.id}`}
                  title={`邻居推荐：${p.name}（${providerCategoryLabel(p)}）`}
                  lines={impactShareLines(p.name, providerCategoryLabel(p), c)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
