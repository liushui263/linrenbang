"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { saveArea } from "@/app/actions/location";

/**
 * 片区筛选：选了马上显示新值（不等服务器），同时写进 URL（?area=，能分享、刷新不丢）
 * 和 cookie（点别的分类/回首页还记得）。
 */
export default function AreaSelect({ areas, value }: { areas: string[]; value: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = useState(value ?? "");
  const [pending, start] = useTransition();

  useEffect(() => setSelected(value ?? ""), [value]);

  function choose(area: string) {
    setSelected(area);
    const next = new URLSearchParams(params.toString());
    if (area) next.set("area", area);
    else next.delete("area");
    next.delete("page"); // 换片区后结果变了，回到第 1 页
    const qs = next.toString();
    start(async () => {
      await saveArea(area || null);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
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
