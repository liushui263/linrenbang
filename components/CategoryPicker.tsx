"use client";

import { useState } from "react";
import { CATEGORIES, OTHER_CATEGORY } from "@/constants/categories";
import { FieldError } from "./ActionForm";

const input = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2";
const label = "block text-sm font-medium text-gray-700";

/** 主营分类；选“其他服务”时出现必填的服务名 */
export default function CategoryPicker({ category, customService }: { category?: string; customService?: string | null }) {
  const [value, setValue] = useState(category ?? "");
  return (
    <>
      <div>
        <label className={label}>主营分类 *</label>
        <select name="category" required value={value} onChange={(e) => setValue(e.target.value)} className={input}>
          <option value="" disabled>
            选一个
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.zh}
            </option>
          ))}
        </select>
        <FieldError name="category" />
      </div>
      {value === OTHER_CATEGORY && (
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
