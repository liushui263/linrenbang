import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import ProviderFields from "@/components/ProviderFields";
import RecommendationFields from "@/components/RecommendationFields";
import SubmitButton from "@/components/SubmitButton";
import { submitNeighborProvider, submitRecommendation } from "@/app/actions/recommend";
import { providerCategoryLabel } from "@/constants/categories";
import { getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";
import { getAsk } from "@/lib/asks";
import { getPublicProvider } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import PhoneCheck from "./PhoneCheck";

export const metadata: Metadata = { title: "推荐一位师傅" };
export const dynamic = "force-dynamic";

type SP = { provider?: string; new?: string; phone?: string; submitted?: string; ask?: string };

export default async function RecommendPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [user, loc] = await Promise.all([getCurrentUser().catch(() => null), getVisitorLocation()]);
  const here = `/recommend?${new URLSearchParams(sp as Record<string, string>).toString()}`;
  // 从求推荐页“添加一位新师傅”进来：提交后顺带回答那条提问
  const ask = sp.ask ? await getAsk(sp.ask) : null;
  const askOpen = ask?.status === "open";
  const askBanner = ask && (
    <div className={`rounded-2xl border p-3 text-sm ${askOpen ? "border-amber-200 bg-amber-50 text-amber-900" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
      <p className="text-xs">{askOpen ? "推荐给这位邻居：" : "这条提问已经关闭，推荐会照常提交到师傅名片："}</p>
      <Link href={`/ask/${ask.id}`} className="font-medium underline">
        {ask.area} · {ask.title}
      </Link>
    </div>
  );
  const askField = askOpen ? <input type="hidden" name="ask_id" value={ask.id} /> : null;

  if (sp.submitted) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-2xl">🙏</p>
        <p className="font-semibold">已提交，站长审核通过后就会显示。</p>
        <Link href="/" className="text-emerald-700 underline">
          回首页
        </Link>
      </div>
    );
  }

  const loginGate = (
    <div className="rounded-2xl bg-white p-4 text-sm">
      写推荐需要先登录（用 Google 账号，一分钟）。
      <Link href={`/login?next=${encodeURIComponent(here)}`} className="ml-1 font-medium text-emerald-700 underline">
        去登录
      </Link>
    </div>
  );

  // 给已有商家写推荐
  if (sp.provider) {
    const p = await getPublicProvider(sp.provider);
    if (!p) return <p className="py-8 text-center text-gray-500">没找到这个商家。</p>;
    let mine = null;
    let isOwner = false;
    if (user) {
      const admin = createAdminClient();
      const [{ data: rec }, { data: priv }] = await Promise.all([
        admin
          .from("recommendations")
          .select("recommender_area, service_item, cost_approx, comment")
          .eq("provider_id", p.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        admin.from("providers").select("owner_user_id").eq("id", p.id).single(),
      ]);
      mine = rec;
      isOwner = priv?.owner_user_id === user.id;
    }
    return (
      <div className="space-y-4 py-6">
        {askBanner}
        <h1 className="text-xl font-bold">
          推荐 {p.name}
          <span className="ml-2 text-sm font-normal text-gray-500">{providerCategoryLabel(p)}</span>
        </h1>
        {!user ? (
          loginGate
        ) : isOwner ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-gray-600">商家不能给自己写推荐。</p>
        ) : (
          <ActionForm action={submitRecommendation} hideOnSuccess>
            {askField}
            {mine && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">你推荐过这家，可以修改（修改后需要重新审核）。</p>}
            <input type="hidden" name="provider_id" value={p.id} />
            <RecommendationFields areas={loc.city.areas} d={mine ?? { recommender_area: loc.area ?? undefined }} />
            <SubmitButton>{mine ? "保存修改" : "提交推荐"}</SubmitButton>
          </ActionForm>
        )}
      </div>
    );
  }

  // 代录入新商家
  if (sp.new) {
    return (
      <div className="space-y-4 py-6">
        {askBanner}
        <h1 className="text-xl font-bold">推荐一位还没上网站的师傅</h1>
        {!user ? (
          loginGate
        ) : (
          <ActionForm action={submitNeighborProvider}>
            {askField}
            <h2 className="font-semibold">师傅/商家信息</h2>
            <ProviderFields minimal cityId={loc.city.id} d={{ phone: sp.phone }} />
            <h2 className="pt-2 font-semibold">你的推荐</h2>
            <RecommendationFields areas={loc.city.areas} d={{ recommender_area: loc.area ?? undefined }} />
            <SubmitButton>提交</SubmitButton>
          </ActionForm>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6">
      {askBanner}
      <h1 className="text-xl font-bold">推荐一位师傅</h1>
      <p className="text-sm text-gray-600">先输入师傅的电话，看看网站上有没有。有的话直接写推荐，没有的话帮他登记。</p>
      <PhoneCheck askId={askOpen ? ask.id : undefined} />
    </div>
  );
}
