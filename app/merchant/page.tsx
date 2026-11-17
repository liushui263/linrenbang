import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requestTakedown, updateMerchant } from "@/app/actions/merchant";
import ActionForm from "@/components/ActionForm";
import ImageUpload from "@/components/ImageUpload";
import ProviderCard from "@/components/ProviderCard";
import ProviderFields from "@/components/ProviderFields";
import SubmitButton from "@/components/SubmitButton";
import { categoryName } from "@/constants/categories";
import { getCurrentUser } from "@/lib/auth";
import { formatUsPhone } from "@/lib/phone";
import { getTodayRotation } from "@/lib/providers";
import { foundingDaysLeft, isFoundingActive } from "@/lib/rotation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_PROVIDER_COLUMNS, type PublicProvider } from "@/lib/types";
import PauseToggle from "./PauseToggle";

export const metadata: Metadata = { title: "我的名片", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending: "待审核（一般 24 小时内）",
  active: "已上线",
  paused: "暂停接单中",
  hidden: "已隐藏（如有疑问请联系站长）",
};

/** 第 9 节 /merchant 极简页：看名片、编辑、看推荐数、看创始名次/轮换状态。不做图表、不做看板 */
export default async function MerchantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/merchant");
  const admin = createAdminClient();
  const { data } = await admin
    .from("providers")
    .select(`${PUBLIC_PROVIDER_COLUMNS}, phone, wechat_id, license_number, license_photo_url`)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!data) {
    return (
      <div className="space-y-3 py-8 text-center">
        <p>你还没有商家名片。</p>
        <Link href="/merchant/register" className="text-emerald-700 underline">
          免费注册
        </Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/merchant/claim" className="text-emerald-700 underline">
          认领已有的店
        </Link>
      </div>
    );
  }
  const p = data as unknown as PublicProvider & {
    phone: string;
    wechat_id: string | null;
    license_number: string | null;
    license_photo_url: string | null;
  };
  // 邻居给我的推荐（已展示的全部列出，审核中的只给个数）
  const { data: recRows } = await admin
    .from("recommendations")
    .select("id, recommender_area, service_item, cost_approx, comment, status, created_at")
    .eq("provider_id", p.id)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false });
  const myRecs = (recRows ?? []).filter((r) => r.status === "active");
  const pendingRecs = (recRows ?? []).length - myRecs.length;

  // 执照照片在私有桶里，用临时链接给本人看
  let licenseUrl: string | null = null;
  if (p.license_photo_url) {
    const { data: signed } = await admin.storage.from("licenses").createSignedUrl(p.license_photo_url, 60 * 30);
    licenseUrl = signed?.signedUrl ?? null;
  }

  const founding = isFoundingActive(p.founding_expires_at);
  let inPool = false;
  let todayPick = false;
  if (founding && p.status === "active") {
    const { count } = await admin
      .from("providers")
      .select("id", { count: "exact", head: true })
      .eq("city_id", p.city_id)
      .eq("category", p.category)
      .eq("status", "active")
      .gt("founding_expires_at", new Date().toISOString())
      .lt("founding_started_at", p.founding_started_at!);
    inPool = (count ?? 0) < 10;
    if (inPool) todayPick = (await getTodayRotation(p.city_id, p.category)).some((x) => x.id === p.id);
  }

  return (
    <div className="space-y-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">我的名片</h1>
        <span className="text-sm text-gray-500">{STATUS[p.status]}</span>
      </div>

      <ProviderCard provider={p} isTodayPick={todayPick} share={p.status === "active" || p.status === "paused"} />

      <section className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl bg-white p-4">
          <div className="text-2xl font-bold text-orange-600">{p.recommend_count}</div>
          <div className="text-xs text-gray-500">位邻居推荐</div>
        </div>
        <div className="rounded-2xl bg-white p-4">
          {p.founding_rank ? (
            <>
              <div className="text-2xl font-bold text-amber-600">#{p.founding_rank}</div>
              <div className="text-xs text-gray-500">
                {founding ? `创始商家 · 还剩 ${foundingDaysLeft(p.founding_expires_at)} 天` : "创始期已结束"}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-400">—</div>
              <div className="text-xs text-gray-500">{p.status === "pending" ? "通过后算名次" : "非创始商家"}</div>
            </>
          )}
        </div>
      </section>

      <p className="rounded-2xl bg-white p-4 text-sm text-gray-600">
        轮换状态：
        {p.status === "paused"
          ? "暂停接单期间不参加轮换"
          : todayPick
            ? `今天你在“${categoryName(p.category)}”的今日推荐里`
            : inPool
              ? `你在“${categoryName(p.category)}”的轮换池里，每天轮着上`
              : founding
                ? "本分类轮换池已满（前 10 名），前面的人到期后自动递补"
                : "不在轮换池，按邻居推荐数正常排序"}
      </p>

      {(p.status === "active" || p.status === "paused") && <PauseToggle paused={p.status === "paused"} />}

      <section id="recommendations" className="rounded-2xl bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">邻居给我的推荐（{myRecs.length}）</h2>
          {(p.status === "active" || p.status === "paused") && (
            <Link href={`/provider/${p.id}`} className="text-sm text-emerald-700 underline">
              看我的公开名片
            </Link>
          )}
        </div>
        {pendingRecs > 0 && <p className="mb-2 text-xs text-gray-500">另有 {pendingRecs} 条在审核中，通过后会显示在这里。</p>}
        {myRecs.length === 0 ? (
          <p className="text-sm text-gray-500">还没有邻居推荐。把名片分享给老客户，请他们来写一句吧。</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {myRecs.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">{r.recommender_area} 邻居</span>
                  <span>{new Date(r.created_at).toLocaleDateString("zh-CN", { timeZone: "America/Chicago" })}</span>
                </div>
                {(r.service_item || r.cost_approx) && (
                  <p className="mt-1 text-gray-500">
                    {r.service_item && <>修了：{r.service_item}</>}
                    {r.service_item && r.cost_approx && " · "}
                    {r.cost_approx && <>大约：{r.cost_approx}</>}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-gray-800">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4">
        <h2 className="mb-3 font-semibold">编辑名片</h2>
        <p className="mb-3 text-sm text-gray-500">电话：{formatUsPhone(p.phone)}（不可改，要换号请联系站长）</p>
        <ActionForm action={updateMerchant}>
          <ProviderFields d={p} showPhone={false} />
          <ImageUpload name="avatar" label={p.avatar_url ? "头像" : "头像（选填）"} crop current={p.avatar_url} />
          <ImageUpload name="license_photo" label={licenseUrl ? "执照照片" : "执照照片（选填）"} current={licenseUrl} />
          <SubmitButton>保存</SubmitButton>
        </ActionForm>
      </section>

      <details className="rounded-2xl bg-white p-4 text-sm">
        <summary className="cursor-pointer text-gray-500">申请下架</summary>
        <div className="mt-3">
          <ActionForm action={requestTakedown} hideOnSuccess>
            <input name="reason" maxLength={300} placeholder="原因（选填）" className="w-full rounded-xl border border-gray-300 px-3 py-2" />
            <button className="w-full rounded-xl border border-red-300 py-2 text-red-600">提交下架申请</button>
          </ActionForm>
        </div>
      </details>
    </div>
  );
}
