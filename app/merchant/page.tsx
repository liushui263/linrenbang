import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requestTakedown, updateMerchant } from "@/app/actions/merchant";
import ActionForm, { FieldError } from "@/components/ActionForm";
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
    .select(`${PUBLIC_PROVIDER_COLUMNS}, phone, wechat_id, license_number`)
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
  const p = data as unknown as PublicProvider & { phone: string; wechat_id: string | null; license_number: string | null };

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

      <ProviderCard provider={p} isTodayPick={todayPick} />

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

      <section className="rounded-2xl bg-white p-4">
        <h2 className="mb-3 font-semibold">编辑名片</h2>
        <p className="mb-3 text-sm text-gray-500">电话：{formatUsPhone(p.phone)}（不可改，要换号请联系站长）</p>
        <ActionForm action={updateMerchant}>
          <ProviderFields d={p} showPhone={false} />
          <div>
            <label className="block text-sm font-medium text-gray-700">换头像（选填）</label>
            <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" className="mt-1 text-sm" />
            <FieldError name="avatar" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">上传执照照片（选填）</label>
            <input type="file" name="license_photo" accept="image/jpeg,image/png,image/webp" className="mt-1 text-sm" />
            <FieldError name="license_photo" />
          </div>
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
