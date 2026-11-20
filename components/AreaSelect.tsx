"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AREA_COOKIE } from "@/constants/site";

/**
 * 片区筛选：选了马上换 URL（?area=，能分享、刷新不丢），页面立刻按新片区重新渲染；
 * 同时在浏览器里写 cookie（点别的分类/回首页还记得）。
 * 不走 server action：action 里的 revalidatePath 和 router.replace 抢着刷新，之前会出现 URL 变了但内容没变。
 */
export default function AreaSelect({ areas, value }: { areas: string[]; value: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = useState(value ?? "");
  const [pending, start] = useTransition();

  useEffect(() => setSelected(value ?? ""), [value]);

  function choose(area: string) {
    if (area && !areas.includes(area)) return;
    setSelected(area);
    document.cookie = area
      ? `${AREA_COOKIE}=${encodeURIComponent(area)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
      : `${AREA_COOKIE}=; path=/; max-age=0; samesite=lax`;
    const next = new URLSearchParams(params.toString());
    if (area) next.set("area", area);
    else next.delete("area");
    next.delete("page"); // 换片区后结果变了，回到第 1 页
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <select
      aria-label="片区"
      aria-busy={pending}
      value={selected}
      onChange={(e) => choose(e.target.value)}
      className={`rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm ${pending ? "opacity-70" : ""}`}
    >
      <option value="">全部片区</option>
      {areas.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );
}
