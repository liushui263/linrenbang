import Link from "next/link";
import { categoryName, providerCategoryLabel } from "@/constants/categories";
import type { SeasonalReminder } from "@/constants/seasonal";
import type { PublicProvider } from "@/lib/types";

/**
 * 首页的季节提醒卡片：当月第一条提醒 + 2 位推荐师傅 + 去分享页的入口。
 * 当月还有别的提醒时，下面一行小字链接过去。
 */
export default function SeasonalCard({
  reminder: r,
  picks,
  others,
}: {
  reminder: SeasonalReminder;
  picks: PublicProvider[];
  others: SeasonalReminder[];
}) {
  return (
    <section aria-label="季节提醒" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Link href={`/season/${r.id}`} className="block px-3.5 pb-2.5 pt-3" style={{ background: `linear-gradient(135deg, ${r.color}14, ${r.color}05)` }}>
        {/* 图标 + 标题 + 看清单 一行；说明文字单独一整行，左边和图标对齐 */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl"
            style={{ backgroundColor: `${r.color}1f` }}
          >
            {r.icon}
          </span>
          <p className="min-w-0 flex-1 font-bold leading-snug text-gray-900">{r.title}</p>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: r.color }}>
            看清单
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
          <span className="font-medium" style={{ color: r.color }}>
            季节提醒 ·{" "}
          </span>
          {r.subtitle}
        </p>
      </Link>
      <div className="border-t border-slate-100 px-3.5 py-2 text-sm leading-snug">
        {picks.length > 0 ? (
          <ul className="space-y-1">
            {picks.map((p) => (
              <li key={p.id}>
                <Link href={`/provider/${p.id}`} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-gray-900">{p.name}</span>
                    <span className="ml-1.5 text-xs text-gray-500">{providerCategoryLabel(p)}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-orange-600">🔥 {p.recommend_count}位邻居推荐</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-snug text-gray-500">
            还没有邻居推荐{categoryName(r.categories[0])}师傅，
            <Link href="/recommend" className="text-emerald-700 underline">
              你来推荐第一个
            </Link>
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
          <Link href={`/season/${r.id}`} className="font-medium text-emerald-700">
            转发到微信群 →
          </Link>
          {others.length > 0 && (
            <span className="text-gray-500">
              本月还有：
              {others.map((o, i) => (
                <span key={o.id}>
                  {i > 0 && " · "}
                  <Link href={`/season/${o.id}`} className="underline underline-offset-2">
                    {o.icon} {o.title}
                  </Link>
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
