import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContactButtons from "@/components/ContactButtons";
import CopyLinkButton from "@/components/CopyLinkButton";
import ProviderCard from "@/components/ProviderCard";
import ReportButton from "@/components/ReportButton";
import { providerCategoryLabel } from "@/constants/categories";
import { getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";
import { getPublicProvider } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PublicRecommendation } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// 13.2：商家详情页动态分享卡片（不含电话和微信）
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getPublicProvider(id);
  if (!p) return { title: "没找到这个商家" };
  const title = `邻居推荐：${p.name}（${providerCategoryLabel(p)}）- 邻人帮`;
  const description = `${p.recommend_count}位邻居推荐 · 服务区域：${p.service_areas.join(" / ")}。${
    p.tagline || p.description?.slice(0, 50) || ""
  }`;
  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: "profile",
      title,
      description,
      url: `/provider/${p.id}`,
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-default.png"] },
  };
}

export default async function ProviderPage({ params }: Props) {
  const { id } = await params;
  const p = await getPublicProvider(id);
  if (!p) notFound();

  const supabase = await createClient();
  const [loc, user, recsRes] = await Promise.all([
    getVisitorLocation(),
    getCurrentUser().catch(() => null),
    supabase
      .from("recommendations")
      .select("id, provider_id, recommender_area, service_item, cost_approx, comment, created_at")
      .eq("provider_id", p.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);
  const recs = (recsRes.data ?? []) as PublicRecommendation[];

  // 13.4：同片区邻居的推荐排最前
  const sameArea = (r: PublicRecommendation) => !!loc.area && r.recommender_area === loc.area;
  const sorted = [...recs].sort((a, b) => Number(sameArea(b)) - Number(sameArea(a)));

  // 执照照片在私有桶里，用临时链接展示
  let licenseUrl: string | null = null;
  const admin = createAdminClient();
  const { data: priv } = await admin.from("providers").select("license_photo_url, owner_user_id").eq("id", p.id).single();
  if (priv?.license_photo_url) {
    const { data } = await admin.storage.from("licenses").createSignedUrl(priv.license_photo_url, 60 * 10);
    licenseUrl = data?.signedUrl ?? null;
  }
  const isOwner = !!user && priv?.owner_user_id === user.id;

  return (
    <div className="space-y-5 pb-24 pt-4">
      <ProviderCard provider={p} expanded />

      <section className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-gray-700">
        <h2 className="mb-2 font-semibold text-gray-900">简介</h2>
        <p className="whitespace-pre-wrap">{p.description || "商家还没写简介。"}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {p.is_insured && <span>自称有保险 · 未经核实</span>}
          {p.is_licensed && p.license_status !== "unclaimed" && <span>执照状态：商家自述</span>}
        </div>
        {licenseUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={licenseUrl} alt="商家上传的执照照片" className="mt-3 max-h-64 max-w-full rounded-lg border object-contain" />
        )}
        <div className="mt-3 flex items-center justify-between">
          <CopyLinkButton />
          <ReportButton targetType="provider" targetId={p.id} />
        </div>
      </section>

      <section id="recommendations">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">邻居推荐（{recs.length}）</h2>
          {!isOwner && (
            <Link href={`/recommend?provider=${p.id}`} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">
              我也推荐
            </Link>
          )}
        </div>
        {sorted.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-gray-500">还没有邻居推荐，用过的话来写第一条吧。</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">{r.recommender_area} 邻居</span>
                  {sameArea(r) && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">同片区邻居</span>}
                  <span>{new Date(r.created_at).toLocaleDateString("zh-CN", { timeZone: "America/Chicago" })}</span>
                </div>
                {(r.service_item || r.cost_approx) && (
                  <p className="mt-2 text-gray-500">
                    {r.service_item && <>修了：{r.service_item}</>}
                    {r.service_item && r.cost_approx && " · "}
                    {r.cost_approx && <>大约：{r.cost_approx}</>}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-gray-800">{r.comment}</p>
                <div className="mt-2 text-right">
                  <ReportButton targetType="recommendation" targetId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 底部悬浮栏 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <ContactButtons providerId={p.id} hasWechat={p.has_wechat} paused={p.status === "paused"} />
        </div>
      </div>
    </div>
  );
}
