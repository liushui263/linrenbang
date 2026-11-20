import type { Metadata } from "next";
import Link from "next/link";
import AskCard from "@/components/AskCard";
import { CATEGORY_GROUPS, findGroup } from "@/constants/categories";
import { CLOSED_FOLD_DAYS } from "@/lib/ask";
import { countWaiting, listAsks } from "@/lib/asks";
import { getVisitorLocation } from "@/lib/location";

export const metadata: Metadata = {
  title: "邻居求推荐",
  description: "邻居问，邻居答。找不到靠谱的师傅？问问附近用过的邻居。",
};
export const dynamic = "force-dynamic";

type SP = { area?: string; group?: string; tab?: string; page?: string };

export default async function AskListPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const loc = await getVisitorLocation();
  const area = sp.area && loc.city.areas.includes(sp.area) ? sp.area : undefined;
  const group = findGroup(sp.group)?.id;
  const waiting = sp.tab === "waiting";
  const page = Math.max(1, Number(sp.page) || 1);

  const [list, waitingCount] = await Promise.all([
    listAsks({ cityId: loc.city.id, area, group, waiting, page }),
    countWaiting(loc.city.id, area, group),
  ]);

  const href = (o: Partial<Record<keyof SP, string | undefined>>) => {
    const merged = { area, group, tab: waiting ? "waiting" : undefined, ...o };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]).toString();
    return qs ? `/ask?${qs}` : "/ask";
  };
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-xs ${active ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`;
  // 访客自己的片区排在“全部”后面第一个
  const areas = loc.area ? [loc.area, ...loc.city.areas.filter((a) => a !== loc.area)] : loc.city.areas;
  const newHref = `/ask/new${area || group ? `?${new URLSearchParams({ ...(area && { area }), ...(group && { group }) })}` : ""}`;

  return (
    <div className="space-y-4 pb-4 pt-4">
      <section>
        <h1 className="text-xl font-bold text-gray-900">🙋 邻居求推荐</h1>
        <p className="mt-0.5 text-sm text-gray-500">邻居问，邻居答。只推荐自己真用过的。</p>
      </section>

      <section className="space-y-2">
        <nav aria-label="片区" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Link href={href({ area: undefined, page: undefined })} className={chip(!area)} aria-current={!area ? "page" : undefined}>
            全部片区
          </Link>
          {areas.map((a) => (
            <Link key={a} href={href({ area: a, page: undefined })} className={chip(area === a)} aria-current={area === a ? "page" : undefined}>
              {a}
            </Link>
          ))}
        </nav>
        <nav aria-label="分类" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Link href={href({ group: undefined, page: undefined })} className={chip(!group)} aria-current={!group ? "page" : undefined}>
            全部分类
          </Link>
          {CATEGORY_GROUPS.map((g) => (
            <Link
              key={g.id}
              href={href({ group: g.id, page: undefined })}
              className={chip(group === g.id)}
              aria-current={group === g.id ? "page" : undefined}
            >
              {g.icon} {g.zh}
            </Link>
          ))}
        </nav>
        <div className="flex justify-end">
          <div className="flex rounded-full bg-gray-100 p-0.5 text-xs">
            <Link
              href={href({ tab: undefined, page: undefined })}
              className={`rounded-full px-3 py-1 ${!waiting ? "bg-white font-medium text-gray-900 shadow-sm" : "text-gray-600"}`}
            >
              最新
            </Link>
            <Link
              href={href({ tab: "waiting", page: undefined })}
              className={`rounded-full px-3 py-1 ${waiting ? "bg-white font-medium text-gray-900 shadow-sm" : "text-gray-600"}`}
            >
              等你推荐 {waitingCount > 0 && <b className="text-amber-700">{waitingCount}</b>}
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {list.asks.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600">
            {waiting ? "这里的提问都有邻居回答了 👍" : "这里还没有人提问。"}
            <Link href={newHref} className="ml-1 text-emerald-700 underline">
              你来问第一个
            </Link>
          </div>
        ) : (
          list.asks.map((a) => <AskCard key={a.id} ask={a} />)
        )}
        {list.pageCount > 1 && (
          <div className="flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={href({ page: String(page - 1) })} className="text-emerald-700">
                ← 上一页
              </Link>
            ) : (
              <span />
            )}
            <span className="text-gray-400">
              {page} / {list.pageCount}
            </span>
            {page < list.pageCount ? (
              <Link href={href({ page: String(page + 1) })} className="text-emerald-700">
                下一页 →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
        <p className="text-center text-xs text-gray-400">已解决的提问 {CLOSED_FOLD_DAYS} 天后自动收起</p>
      </section>

      <div className="sticky bottom-3 z-30">
        <Link href={newHref} className="block rounded-2xl bg-emerald-600 py-3.5 text-center text-base font-semibold text-white shadow-lg">
          ✋ 我也要问邻居
        </Link>
      </div>
    </div>
  );
}
