import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProviderCard from "@/components/ProviderCard";
import ShareButton from "@/components/ShareButton";
import { categoryName } from "@/constants/categories";
import { SEASONAL_REMINDERS } from "@/constants/seasonal";
import { SITE_NAME } from "@/constants/site";
import { getVisitorLocation } from "@/lib/location";
import { getSeasonalPicks } from "@/lib/providers";
import { chicagoMonth, findReminder, monthsLabel } from "@/lib/seasonal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// 微信分享卡片：标题用 shareTitle，图片是同目录的 opengraph-image（自动挂上 og:image）
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = findReminder(id);
  if (!r) return { title: "没找到这条提醒" };
  const title = `${r.shareTitle} - ${SITE_NAME}`;
  return {
    title: { absolute: title },
    description: r.subtitle,
    openGraph: { type: "article", title, description: r.subtitle, url: `/season/${r.id}` },
    twitter: { card: "summary_large_image", title, description: r.subtitle },
  };
}

export default async function SeasonPage({ params }: Props) {
  const { id } = await params;
  const r = findReminder(id);
  if (!r) notFound();
  const loc = await getVisitorLocation();
  const picks = await getSeasonalPicks(loc.city.id, r.categories, 6).catch(() => []);
  const month = chicagoMonth();
  const inSeason = r.months.includes(month);
  const others = SEASONAL_REMINDERS.filter((x) => x.enabled && x.id !== r.id && x.months.includes(month));
  const firstCat = r.categories[0];

  const shareLines = [
    `${r.icon} ${r.title}`,
    r.subtitle,
    ...(picks.length ? [`邻居推荐：${picks.slice(0, 3).map((p) => p.name).join("、")}`] : []),
  ];

  return (
    <div className="space-y-5 pb-8 pt-4">
      <section
        className="relative overflow-hidden rounded-3xl p-5 text-white shadow-sm sm:p-6"
        style={{ background: `linear-gradient(135deg, ${r.color} 0%, #064e3b 100%)` }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-white/80">
            {SITE_NAME} · {loc.city.zh}季节提醒 · {monthsLabel(r.months)}
            {!inSeason && "（不是当季）"}
          </p>
          <ShareButton path={`/season/${r.id}`} title={r.shareTitle} lines={shareLines} what="提醒" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl">
            {r.icon}
          </span>
          <h1 className="text-2xl font-bold leading-tight">{r.title}</h1>
        </div>
        <p className="mt-2 text-sm text-white/90">{r.subtitle}</p>
      </section>

      <section className="rounded-2xl bg-white p-4">
        <h2 className="font-bold text-gray-900">该做什么</h2>
        <ol className="mt-2 space-y-2 text-sm text-gray-700">
          {r.tips.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-5 shrink-0 font-bold" style={{ color: r.color }}>
                {i + 1}.
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 flex items-baseline justify-between font-bold text-gray-900">
          邻居推荐的师傅
          <span className="text-xs font-normal text-gray-400">{r.categories.map(categoryName).join(" · ")}</span>
        </h2>
        {picks.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-gray-600">
            {loc.city.zh}这几个分类还没有邻居推荐，
            <Link href="/recommend" className="text-emerald-700 underline">
              你来推荐第一个
            </Link>
            。
          </p>
        ) : (
          <div className="space-y-3">
            {picks.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}
        <Link href={`/?category=${firstCat}`} className="mt-3 block text-center text-sm text-emerald-700 underline">
          看全部{categoryName(firstCat)}师傅 →
        </Link>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="font-bold text-emerald-900">发到微信群</h2>
        <p className="mt-1 text-sm text-emerald-900/80">
          点右上角“分享”把这页发给邻居；或者长按下面的图片保存，直接发图到群里。图上只有师傅名字，电话要打开网页看。
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/season/${r.id}/poster.png`}
          alt={`${r.title}提醒图片，长按保存`}
          className="mx-auto mt-3 w-full max-w-xs rounded-xl border border-emerald-200 shadow-sm"
          loading="lazy"
        />
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-gray-900">本月其他提醒</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((o) => (
              <Link key={o.id} href={`/season/${o.id}`} className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200">
                {o.icon} {o.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
