"use client";

import Link from "next/link";
import { useState } from "react";
import { categoryName } from "@/constants/categories";
import { RANKED_PREVIEW } from "@/constants/site";

export interface RankedRow {
  id: string;
  name: string;
  categories: string[];
  recommend_count: number;
  paused: boolean;
}

/** 全部商家一行一家：名字、分类、推荐数。先显示前 10，点“更多商家”展开全部 */
export default function RankedList({ rows }: { rows: RankedRow[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, RANKED_PREVIEW);
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <ol className="divide-y divide-slate-100">
        {shown.map((r, i) => (
          <li key={r.id}>
            <Link href={`/provider/${r.id}`} className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50">
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-gray-900">{r.name}</span>
                <span className="ml-1.5 text-xs text-gray-500">{r.categories.map(categoryName).join(" · ")}</span>
                {r.paused && <span className="ml-1.5 rounded bg-gray-100 px-1 text-[11px] text-gray-500">暂停接单</span>}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-emerald-700">{r.recommend_count} 推荐</span>
            </Link>
          </li>
        ))}
      </ol>
      {!all && rows.length > RANKED_PREVIEW && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="block w-full border-t border-slate-100 py-2.5 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          更多商家（共 {rows.length} 家）▾
        </button>
      )}
    </div>
  );
}
