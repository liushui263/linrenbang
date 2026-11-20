"use client";

import { useState } from "react";

const chip = "flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm";

/**
 * 服务区域多选：最上面一个“大休斯顿地区”= 全选。
 * 勾它就全选 8 个片区；8 个都勾上它也自动勾上。库里照样存片区列表。
 */
export default function ServiceAreaPicker({
  areas,
  metroZh,
  selected = [],
}: {
  areas: string[];
  metroZh: string;
  selected?: string[];
}) {
  const [picked, setPicked] = useState<string[]>(() => areas.filter((a) => selected.includes(a)));
  const all = areas.length > 0 && areas.every((a) => picked.includes(a));
  const toggle = (a: string, on: boolean) =>
    setPicked((cur) => (on ? areas.filter((x) => x === a || cur.includes(x)) : cur.filter((x) => x !== a)));

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700">服务区域 *（可多选）</legend>
      <label className={`mt-1 inline-flex font-medium ${chip}`}>
        <input type="checkbox" checked={all} onChange={(e) => setPicked(e.target.checked ? [...areas] : [])} />
        {metroZh}（全部片区）
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {areas.map((a) => (
          <label key={a} className={chip}>
            <input
              type="checkbox"
              name="service_areas"
              value={a}
              checked={picked.includes(a)}
              onChange={(e) => toggle(a, e.target.checked)}
            />
            {a}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
