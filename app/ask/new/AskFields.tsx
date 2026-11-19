"use client";

import { useState } from "react";
import { FieldError } from "@/components/ActionForm";
import { CATEGORIES, CATEGORY_GROUPS } from "@/constants/categories";
import { ASK_DETAILS_MAX, ASK_TITLE_MAX, URGENCIES } from "@/lib/ask";

const label = "mb-1.5 block text-sm font-semibold text-gray-800";
const input = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const chip = (on: boolean) =>
  `cursor-pointer rounded-full px-3 py-1.5 text-xs transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-400 ${
    on ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
  }`;
const subChip = (on: boolean) =>
  `cursor-pointer rounded-full px-3 py-1 text-xs ${on ? "bg-emerald-100 font-medium text-emerald-800 ring-1 ring-emerald-400" : "bg-white text-slate-700 ring-1 ring-slate-200"}`;

export default function AskFields({
  title,
  group: initialGroup,
  areas,
  area,
  zip,
}: {
  title: string;
  group?: string;
  areas: string[];
  area?: string;
  zip?: string | null;
}) {
  const [group, setGroup] = useState(initialGroup ?? "");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("week");
  const g = CATEGORY_GROUPS.find((x) => x.id === group);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ask-title" className={label}>
          你要找什么？
        </label>
        <input id="ask-title" name="title" defaultValue={title} maxLength={ASK_TITLE_MAX} required className={input} placeholder="如：求靠谱水管师傅，厨房水槽一直滴水" />
        <FieldError name="title" />
        <p className="mt-1 text-xs text-gray-400">一句话说清楚，最多 {ASK_TITLE_MAX} 字</p>
      </div>

      <div>
        <label htmlFor="ask-details" className={label}>
          补充说明 <span className="font-normal text-gray-400">（选填）</span>
        </label>
        <textarea
          id="ask-details"
          name="details"
          rows={3}
          maxLength={ASK_DETAILS_MAX}
          className={input}
          placeholder="比如：房子多大、什么时候要、预算、要不要会讲中文……"
        />
        <FieldError name="details" />
      </div>

      <fieldset>
        <legend className={label}>分类</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_GROUPS.map((x) => (
            <label key={x.id} className={chip(group === x.id)}>
              <input
                type="radio"
                name="category_group"
                value={x.id}
                checked={group === x.id}
                onChange={() => {
                  setGroup(x.id);
                  setCategory("");
                }}
                className="sr-only"
              />
              {x.icon} {x.zh}
            </label>
          ))}
        </div>
        {g && g.categories.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {g.categories.map((id) => {
              const c = CATEGORIES.find((x) => x.id === id)!;
              const on = category === id;
              return (
                <label key={id} className={subChip(on)}>
                  <input
                    type="radio"
                    name="category"
                    value={id}
                    checked={on}
                    onChange={() => setCategory(id)}
                    onClick={() => on && setCategory("")}
                    className="sr-only"
                  />
                  {c.icon} {c.zh}
                  {on && " ✓"}
                </label>
              );
            })}
            <span className="self-center text-xs text-gray-400">（选填）</span>
          </div>
        )}
        <FieldError name="category_group" />
      </fieldset>

      <div>
        <label htmlFor="ask-area" className={label}>
          片区
        </label>
        <select id="ask-area" name="area" defaultValue={area ?? ""} required className={input}>
          <option value="" disabled>
            选一个
          </option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <FieldError name="area" />
        {area && zip && <p className="mt-1 text-xs text-gray-400">按你的 Zip {zip} 自动选的</p>}
      </div>

      <fieldset>
        <legend className={label}>多急？</legend>
        <div className="flex gap-1.5">
          {URGENCIES.map((u) => (
            <label key={u.id} className={chip(urgency === u.id)}>
              <input type="radio" name="urgency" value={u.id} checked={urgency === u.id} onChange={() => setUrgency(u.id)} className="sr-only" />
              {u.zh}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
