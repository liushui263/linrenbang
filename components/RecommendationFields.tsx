import type { RecommendationInput } from "@/lib/provider-form";
import { FieldError } from "./ActionForm";

const input = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2";
const label = "block text-sm font-medium text-gray-700";

export default function RecommendationFields({ areas, d }: { areas: string[]; d?: Partial<RecommendationInput> }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={label}>你住哪个片区 *</label>
        <select name="recommender_area" required defaultValue={d?.recommender_area ?? ""} className={input}>
          <option value="" disabled>
            选一个
          </option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <FieldError name="recommender_area" />
      </div>
      <div>
        <label className={label}>修了什么 / 做了什么</label>
        <input name="service_item" maxLength={60} defaultValue={d?.service_item ?? ""} className={input} placeholder="如：换 50 加仑热水器" />
      </div>
      <div>
        <label className={label}>大概花了多少</label>
        <input name="cost_approx" maxLength={40} defaultValue={d?.cost_approx ?? ""} className={input} placeholder="如：$1,200 含材料" />
      </div>
      <div>
        <label className={label}>推荐理由 *（300 字内）</label>
        <textarea
          name="comment"
          required
          maxLength={300}
          rows={4}
          defaultValue={d?.comment ?? ""}
          className={input}
          placeholder="说一件具体的事：多快上门、价格公不公道、活干得怎么样"
        />
        <FieldError name="comment" />
        <p className="mt-1 text-xs text-gray-500">空话、刷单、自荐会被隐藏。站长审核通过后展示。</p>
      </div>
    </div>
  );
}
