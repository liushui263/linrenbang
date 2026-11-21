"use client";

import { useState } from "react";
import { ANYWHERE_AREA, ANYWHERE_ZH } from "@/constants/cities";

const chip = "flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm";

/**
 * 服务区域多选：最上面一个“大休斯顿地区”= 全选。
 * 勾它就全选 8 个片区；8 个都勾上它也自动勾上。库里照样存片区列表。
 * 再下面一个“不限地区（线上/远程服务）”：和片区互斥，勾上就只存 Anywhere，任何片区的访客都能看到。
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
  const [anywhere, setAnywhere] = useState(() => selected.includes(ANYWHERE_AREA));
  const [picked, setPicked] = useState<string[]>(() =>
    selected.includes(ANYWHERE_AREA) ? [] : areas.filter((a) => selected.includes(a)),
  );
  const all = !anywhere && areas.length > 0 && areas.every((a) => picked.includes(a));
  const toggle = (a: string, on: boolean) => {
    setAnywhere(false);
    setPicked((cur) => (on ? areas.filter((x) => x === a || cur.includes(x)) : cur.filter((x) => x !== a)));
  };

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700">服务区域 *（可多选）</legend>
      <label className={`mt-1 inline-flex font-medium ${chip}`}>
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => {
            setAnywhere(false);
            setPicked(e.target.checked ? [...areas] : []);
          }}
        />
        {metroZh}（全部片区）
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {areas.map((a) => (
          <label key={a} className={`${chip} ${anywhere ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              name={anywhere ? undefined : "service_areas"}
              value={a}
              checked={!anywhere && picked.includes(a)}
              onChange={(e) => toggle(a, e.target.checked)}
            />
            {a}
          </label>
        ))}
      </div>
      <label className={`mt-2 inline-flex font-medium ${chip} ${anywhere ? "border-emerald-400 bg-emerald-50" : ""}`}>
        <input
          type="checkbox"
          name="service_areas"
          value={ANYWHERE_AREA}
          checked={anywhere}
          onChange={(e) => {
            setAnywhere(e.target.checked);
            if (e.target.checked) setPicked([]);
          }}
        />
        {ANYWHERE_ZH}
      </label>
      <p className="mt-1 text-xs text-gray-500">不分地点的服务（如网页制作、线上课程、远程记账）选这个，所有片区的邻居都能看到。</p>
    </fieldset>
  );
}
