import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import ProviderFields from "@/components/ProviderFields";
import RecommendationFields from "@/components/RecommendationFields";
import QuickRecommendFields from "@/components/QuickRecommendFields";
import ShareButton from "@/components/ShareButton";
import SubmitButton from "@/components/SubmitButton";
import { submitAnonRecommendation, submitNeighborProvider, submitRecommendation } from "@/app/actions/recommend";
import { providerCategoryLabel } from "@/constants/categories";
import { getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";
import { getAsk } from "@/lib/asks";
import { getPublicProvider } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import PhoneCheck from "./PhoneCheck";

export const metadata: Metadata = { title: "推荐一位师傅" };
export const dynamic = "force-dynamic";

type SP = { provider?: string; new?: string; phone?: string; submitted?: string; ask?: string; anon?: string; p?: string };

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
    // 推荐的是谁：已经展示的师傅直接分享他的名片；还在审核的就邀请群里邻居也来推荐
    let shared: { id: string; name: string; label: string; live: boolean } | null = null;
    if (sp.p && /^[0-9a-f-]{36}$/i.test(sp.p)) {
      const { data } = await createAdminClient()
        .from("providers")
        .select("id, name, category, categories, custom_service, status")
        .eq("id", sp.p)
        .maybeSingle();
      if (data && data.status !== "hidden") {
        shared = { id: data.id, name: data.name, label: providerCategoryLabel(data), live: ["active", "paused"].includes(data.status) };
      }
    }
    const shareLines = shared?.live
      ? [`邻居推荐：${shared.name}（${shared.label}）`, "我用过觉得不错，大家有需要可以看看👇"]
      : [
          shared ? `我在邻人帮推荐了一位靠谱的${shared.label}师傅：${shared.name}` : "我在邻人帮推荐了一位靠谱师傅",
          "你有用过觉得好的师傅，也来推荐一下吧，不用注册，填三项就行👇",
        ];
    return (
      <div className="space-y-5 py-8">
        <div className="text-center">
          <p className="text-2xl">🙏</p>
          <p className="mt-2 font-semibold">谢谢你帮邻居！已提交，站长审核通过后就会显示。</p>
        </div>

        <section className="rounded-2xl bg-white p-4 text-sm">
          <h2 className="font-semibold text-gray-900">转发到微信群，让更多邻居知道</h2>
          <p className="mt-1 text-gray-600">
            {shared?.live ? "把这位师傅的名片发到群里。" : "邀请群里的邻居也推荐一位自己用过的师傅。"}
          </p>
          <div className="mt-3">
            <ShareButton
              path={shared?.live ? `/provider/${shared.id}` : "/recommend"}
              title={shared?.live ? `邻居推荐：${shared.name}` : "邻人帮 · 推荐一位靠谱师傅"}
              lines={shareLines}
              what={shared?.live ? "名片" : "邀请"}
              label="转发给邻居"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 font-medium text-white"
            />
          </div>
        </section>

        {sp.anon && !user && (
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-gray-700">
            <h2 className="font-semibold text-gray-900">想以后还能找到这条推荐？</h2>
            <p className="mt-1">
              用 Google 或邮箱登录一下，就能认领这条推荐：以后可以修改，还能看到有几位邻居因为你的推荐联系了他。不登录也完全没关系。
            </p>
            <Link
              href={`/login?next=${encodeURIComponent("/recommend/claim")}`}
              className="mt-3 inline-block rounded-xl border border-emerald-600 px-4 py-2 font-medium text-emerald-700"
            >
              登录认领这条推荐
            </Link>
          </section>
        )}

        <div className="flex justify-center gap-6 text-sm">
          <Link href="/recommend" className="text-emerald-700 underline">
            再推荐一位
          </Link>
          <Link href="/" className="text-emerald-700 underline">
            回首页
          </Link>
        </div>
      </div>
    );
  }

  // 冷启动：不登录也能推荐（快速版，三项）；登录了可以写完整推荐
  const loginHint = (
    <p className="text-xs text-gray-500">
      {askOpen ? "登录后提交，会同时回答这位邻居的提问。" : "有账号的话，登录后可以写得更详细（片区、花了多少）。"}
      <Link href={`/login?next=${encodeURIComponent(here)}`} className="ml-1 text-emerald-700 underline">
        去登录
      </Link>
    </p>
  );
  const quickForm = (opts: { providerId?: string; phone?: string }) => (
    <div className="space-y-3">
      <ActionForm action={submitAnonRecommendation}>
        {opts.providerId && <input type="hidden" name="provider_id" value={opts.providerId} />}
        <QuickRecommendFields withProvider={!opts.providerId} phone={opts.phone} />
        <SubmitButton>提交推荐</SubmitButton>
      </ActionForm>
      {loginHint}
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
          quickForm({ providerId: p.id })
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
          quickForm({ phone: sp.phone })
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
      {!user ? (
        <>
          <p className="text-sm text-gray-600">不用注册，填三项就行。你用过觉得靠谱的师傅、店家，都可以推荐给邻居。</p>
          {quickForm({})}
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">先输入师傅的电话，看看网站上有没有。有的话直接写推荐，没有的话帮他登记。</p>
          <PhoneCheck askId={askOpen ? ask.id : undefined} />
        </>
      )}
    </div>
  );
}
