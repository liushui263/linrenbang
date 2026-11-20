import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { closeAsk, reopenAsk } from "@/app/actions/ask";
import ContactButtons from "@/components/ContactButtons";
import ReportButton from "@/components/ReportButton";
import ShareButton from "@/components/ShareButton";
import { providerCategoryLabels } from "@/constants/categories";
import { CLOSED_FOLD_DAYS, askCategoryLabel, timeAgo, urgencyName } from "@/lib/ask";
import { getAsk, getAskAnswers, type AnswerGroup } from "@/lib/asks";
import { getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";
import { createAdminClient } from "@/lib/supabase/admin";
import AnswerForm from "./AnswerForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string; answered?: string }> };

// 微信分享卡片：“邻居求推荐：xxx（Katy）”
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const a = await getAsk(id);
  if (!a) return { title: "没找到这条求推荐" };
  const title = `邻居求推荐：${a.title}（${a.area}）- 邻人帮`;
  const description = a.answer_count
    ? `已有 ${a.answer_count} 位邻居推荐了师傅。你用过靠谱的？也来推荐一下。`
    : "还没人回答，你用过靠谱的师傅吗？推荐给这位邻居。";
  return {
    title: { absolute: title },
    description,
    openGraph: { type: "article", title, description, url: `/ask/${a.id}`, images: [{ url: "/og-default.png", width: 1200, height: 630 }] },
  };
}

function Quote({ q, sameArea }: { q: AnswerGroup["quotes"][number]; sameArea: boolean }) {
  return (
    <li className="mt-2 rounded-xl bg-gray-50 px-3 py-2">
      <p className="whitespace-pre-wrap text-sm text-gray-800">“{q.comment}”</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
        <span>
          {q.recommender_area} 邻居 · {timeAgo(q.created_at)}
        </span>
        {sameArea && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">同片区</span>}
        {q.used_it && <span className="text-emerald-700">✓ 自己用过</span>}
        <span className="ml-auto">
          <ReportButton targetType="ask_answer" targetId={q.id} />
        </span>
      </div>
    </li>
  );
}

function ProviderAnswer({ g, visitorArea, chosen }: { g: AnswerGroup; visitorArea: string | null; chosen: boolean }) {
  const p = g.provider;
  const name = p?.name ?? g.pending!.name;
  const labels = p ? providerCategoryLabels(p) : providerCategoryLabels(g.pending!);
  const sameCount = g.quotes.filter((q) => visitorArea && q.recommender_area === visitorArea).length;
  return (
    <article className={`rounded-2xl bg-white p-4 ${p ? "border border-gray-200 shadow-sm" : "border border-dashed border-gray-300"}`}>
      <div className="flex items-center gap-3">
        {p?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${p ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
          >
            {name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-bold text-gray-900">{name}</h3>
            {labels.slice(0, 2).map((l) => (
              <span key={l} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {l}
              </span>
            ))}
            {!p && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">新推荐 · 审核中</span>}
            {chosen && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">✅ 最后找的是他</span>}
          </div>
          {p ? (
            <Link href={`/provider/${p.id}`} className="text-xs">
              <span className="font-semibold text-orange-600">🔥 {p.recommend_count}位邻居推荐</span>
              <span className="text-emerald-700"> · 看名片 ›</span>
            </Link>
          ) : (
            <p className="text-xs text-gray-500">站长审核后显示电话和微信（一般 24 小时内）</p>
          )}
        </div>
      </div>
      {sameCount > 0 && <p className="mt-2 text-xs font-medium text-emerald-700">🏘️ {sameCount} 位同片区邻居推荐</p>}
      <ul>
        {g.quotes.map((q) => (
          <Quote key={q.id} q={q} sameArea={!!visitorArea && q.recommender_area === visitorArea} />
        ))}
      </ul>
      {p && (
        <div className="mt-3">
          <ContactButtons
            providerId={p.id}
            methods={p.contact_methods}
            pref={p.contact_pref}
            hasWechat={p.has_wechat}
            paused={p.status === "paused"}
          />
        </div>
      )}
    </article>
  );
}

export default async function AskPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const a = await getAsk(id);
  if (!a) notFound();

  const [loc, user] = await Promise.all([getVisitorLocation(), getCurrentUser().catch(() => null)]);
  const groups = await getAskAnswers(a.id, loc.area);
  let isOwner = false;
  if (user) {
    const { data } = await createAdminClient().from("asks").select("user_id").eq("id", a.id).single();
    isOwner = data?.user_id === user.id;
  }
  const open = a.status === "open";
  const answerers = groups.reduce((n, g) => n + g.quotes.length, 0);
  const here = `/ask/${a.id}`;

  return (
    <div className="space-y-5 py-4">
      <Link href="/ask" className="text-sm text-emerald-700">
        ‹ 全部求推荐
      </Link>

      {sp.posted && (
        <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
          ✅ 发好了！转到微信群里，让更多邻居看到，回答会更快。
        </p>
      )}
      {sp.answered && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">🙏 推荐好了，谢谢你帮邻居！</p>}

      <article className={`rounded-2xl border p-4 ${open ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-white px-2 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-200">📍 {a.area}</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-gray-600 ring-1 ring-gray-200">{askCategoryLabel(a)}</span>
          {open && a.urgency !== "flexible" && (
            <span className={`rounded-full px-2 py-0.5 font-medium ${a.urgency === "today" ? "bg-red-50 text-red-600" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>
              {urgencyName(a.urgency)}
            </span>
          )}
          {!open && <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-medium text-white">✅ 已找到师傅</span>}
        </div>
        <h1 className="mt-2 text-lg font-bold leading-snug text-gray-900">{a.title}</h1>
        {a.details && <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-700">{a.details}</p>}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
          <span>
            {a.area} 邻居 · {timeAgo(a.created_at)}
          </span>
          {!isOwner && <ReportButton targetType="ask" targetId={a.id} />}
        </div>
        <div className="mt-3">
          <ShareButton
            path={here}
            title={`邻居求推荐：${a.title}`}
            lines={[`【邻人帮 · 邻居求推荐】${a.area}`, a.title, "用过靠谱的？点进来推荐给这位邻居👇"]}
            label="转到微信群问问"
            heading="转发这条求推荐"
            copyLabel="复制，发到微信群"
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-emerald-600 bg-white py-2.5 text-sm font-medium text-emerald-700 active:bg-emerald-50"
          />
        </div>
      </article>

      {isOwner && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm">
          {open ? (
            <form action={closeAsk} className="space-y-2">
              <input type="hidden" name="ask_id" value={a.id} />
              <p className="font-semibold text-gray-900">找到师傅了吗？</p>
              {groups.length > 0 && (
                <select name="chosen_provider_id" defaultValue="" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2">
                  <option value="">最后找的是哪位？（选填）</option>
                  {groups.map((g) => (
                    <option key={g.providerId} value={g.providerId}>
                      {g.provider?.name ?? g.pending?.name}
                    </option>
                  ))}
                </select>
              )}
              <button className="w-full rounded-xl bg-emerald-600 py-2.5 font-medium text-white">✅ 已经找到了，关闭提问</button>
              <p className="text-xs text-gray-400">关闭后邻居就不能再回答了，{CLOSED_FOLD_DAYS} 天后从列表里收起。</p>
            </form>
          ) : (
            <form action={reopenAsk} className="flex items-center justify-between gap-2">
              <input type="hidden" name="ask_id" value={a.id} />
              <span className="text-gray-600">这条提问已关闭。</span>
              <button className="text-emerald-700 underline">关错了，重新打开</button>
            </form>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold text-gray-900">
          {groups.length ? `${answerers} 位邻居推荐了 ${groups.length} 位师傅` : "还没有邻居回答"}
        </h2>
        {groups.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-gray-500">
            {!open
              ? "这条提问没有收到回答。"
              : isOwner
                ? "邻居回答后会显示在这里。转到微信群里，回答会更快。"
                : "你用过靠谱的？在下面推荐给这位邻居。也可以转到微信群里问问。"}
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <ProviderAnswer key={g.providerId} g={g} visitorArea={loc.area} chosen={a.chosen_provider_id === g.providerId} />
            ))}
          </div>
        )}
      </section>

      {open && !isOwner && (
        <section id="answer" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-gray-900">你用过靠谱的？推荐给这位邻居</h2>
          {user ? (
            <AnswerForm askId={a.id} areas={loc.city.areas} area={loc.area} />
          ) : (
            <div className="text-sm text-gray-600">
              推荐需要先用 Google 登录（一分钟），防止商家自己刷。
              <Link href={`/login?next=${encodeURIComponent(`${here}#answer`)}`} className="ml-1 font-medium text-emerald-700 underline">
                去登录
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

