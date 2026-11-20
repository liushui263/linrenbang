"use client";

import { useState } from "react";
import { CATEGORIES, MAX_CATEGORIES, OTHER_CATEGORY } from "@/constants/categories";
import { FieldError } from "./ActionForm";

const input = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2";
const label = "block text-sm font-medium text-gray-700";

/**
 * 服务分类：最多选 3 个，先选的那个是“主营”（排在名片第一个、参加主营分类的今日推荐轮换）。
 * 选了“其他服务”时出现必填的服务名。
 */
export default function CategoryPicker({
  categories,
  category,
  customService,
}: {
  categories?: string[];
  category?: string;
  customService?: string | null;
}) {
  const [picked, setPicked] = useState<string[]>(categories?.length ? categories : category ? [category] : []);
  const full = picked.length >= MAX_CATEGORIES;

  function toggle(id: string, on: boolean) {
    setPicked((prev) => (on ? (prev.includes(id) || prev.length >= MAX_CATEGORIES ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
  }

  return (
    <>
      <fieldset>
        <legend className={label}>服务分类 *（最多选 {MAX_CATEGORIES} 个）</legend>
        <p className="text-xs text-gray-500">第一个选的是主营分类，名片上排在最前面。邻居在你选的每个分类里都能找到你。</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = picked.includes(c.id);
            const disabled = !on && full;
            return (
              <label
                key={c.id}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-sm ${
                  on ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-gray-200 bg-white"
                } ${disabled ? "opacity-40" : ""}`}
              >
                <input
                  type="checkbox"
                  name="categories"
                  value={c.id}
                  checked={on}
                  disabled={disabled}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                />
                <span aria-hidden="true">{c.icon}</span>
                {c.zh}
                {on && picked[0] === c.id && picked.length > 1 && (
                  <span className="ml-1 rounded bg-emerald-600 px-1 text-xs text-white">主营</span>
                )}
              </label>
            );
          })}
        </div>
        <input type="hidden" name="primary_category" value={picked[0] ?? ""} />
        {full && <p className="mt-1 text-xs text-gray-500">已选满 {MAX_CATEGORIES} 个，想换的话先取消一个。</p>}
        <FieldError name="categories" />
      </fieldset>
      {picked.includes(OTHER_CATEGORY) && (
        <div>
          <label className={label}>具体是什么服务 *（2-12 个字）</label>
          <input
            name="custom_service"
            required
            maxLength={12}
            defaultValue={customService ?? ""}
            className={input}
            placeholder="如：网站设计、钢琴课、报税"
          />
          <p className="mt-1 text-xs text-gray-500">名片上会显示这个名字，而不是“其他”。</p>
          <FieldError name="custom_service" />
        </div>
      )}
    </>
  );
}
