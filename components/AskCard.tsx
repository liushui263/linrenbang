import Link from "next/link";
import { askCategoryLabel, timeAgo, urgencyName } from "@/lib/ask";
import type { AskSummary } from "@/lib/asks";

function Avatars({ names }: { names: string[] }) {
  return (
    <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
      {names.slice(0, 3).map((n, i) => (
        <span
          key={`${n}-${i}`}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 ring-2 ring-white"
        >
          {n.slice(0, 1)}
        </span>
      ))}
    </span>
  );
}

/** 一条求推荐的摘要：片区 + 分类 + 时间 / 标题 / 回答情况。首页、列表页、搜不到时共用 */
export function AskRow({ ask: a }: { ask: AskSummary }) {
  const who =
    a.providerNames.length > 1 ? `${a.providerNames[0]} 等 ${a.providerNames.length} 位` : a.providerNames[0] ?? "";
  return (
    <Link href={`/ask/${a.id}`} className="block py-3">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">📍 {a.area}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{askCategoryLabel(a)}</span>
        {a.urgency === "today" && a.status === "open" && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-600">{urgencyName("today")}</span>
        )}
        <span className="ml-auto text-gray-400">{timeAgo(a.created_at)}</span>
      </div>
      <p className="mt-1.5 text-[15px] font-semibold leading-snug text-gray-900">{a.title}</p>
      {a.status === "closed" ? (
        <p className="mt-1.5 text-xs text-gray-500">✅ 已找到师傅{a.answer_count > 0 && ` · ${a.answer_count} 位邻居推荐过`}</p>
      ) : a.answer_count > 0 && who ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600">
          <Avatars names={a.providerNames} />
          <span className="min-w-0 truncate">
            <b className="font-semibold text-orange-600">{a.answer_count} 位邻居</b>推荐了 {who}
          </span>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">等你推荐</span>
          <span className="text-gray-500">还没人回答，你用过靠谱的吗？</span>
        </div>
      )}
    </Link>
  );
}

export default function AskCard({ ask }: { ask: AskSummary }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
      <AskRow ask={ask} />
    </article>
  );
}
