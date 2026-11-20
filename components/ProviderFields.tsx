import { LANGUAGES } from "@/constants/categories";
import { CITIES } from "@/constants/cities";
import { CONTACT_METHODS } from "@/constants/site";
import { FieldError } from "./ActionForm";
import CategoryPicker from "./CategoryPicker";

export interface ProviderDefaults {
  name?: string;
  phone?: string;
  category?: string;
  categories?: string[];
  custom_service?: string | null;
  city_id?: string;
  service_areas?: string[];
  wechat_id?: string | null;
  tagline?: string | null;
  sub_tags?: string[];
  languages?: string[];
  is_licensed?: boolean;
  license_number?: string | null;
  is_insured?: boolean;
  emergency_24h?: boolean;
  price_note?: string | null;
  description?: string | null;
  contact_methods?: string[];
  contact_pref?: string;
}

const input = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2";
const label = "block text-sm font-medium text-gray-700";

/** 商家表单字段（注册、代录入、编辑共用） */
export default function ProviderFields({
  d = {},
  showPhone = true,
  minimal = false,
  cityId = "houston",
}: {
  d?: ProviderDefaults;
  showPhone?: boolean;
  minimal?: boolean; // 邻居代录入只填关键字段
  cityId?: string;
}) {
  const live = CITIES.filter((c) => c.status === "live");
  const city = live.find((c) => c.id === (d.city_id ?? cityId)) ?? live[0];
  return (
    <div className="space-y-4">
      <div>
        <label className={label}>店名 / 称呼 *</label>
        <input name="name" required maxLength={60} defaultValue={d.name} className={input} placeholder="如：老王空调" />
        <FieldError name="name" />
      </div>
      <CategoryPicker categories={d.categories} category={d.category} customService={d.custom_service} />
      <div>
        <label className={label}>服务城市 *</label>
        <select name="city_id" defaultValue={city.id} className={input}>
          {live.map((c) => (
            <option key={c.id} value={c.id}>
              {c.zh}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className={label}>覆盖片区 *（可多选）</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {city.areas.map((a) => (
            <label key={a} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm">
              <input type="checkbox" name="service_areas" value={a} defaultChecked={d.service_areas?.includes(a)} />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <FieldError name="service_areas" />
      {showPhone && (
        <div>
          <label className={label}>电话 *</label>
          <input name="phone" required inputMode="tel" defaultValue={d.phone} className={input} placeholder="(713) 555-0123" />
          <FieldError name="phone" />
          <p className="mt-1 text-xs text-gray-500">一个号码只能对应一个商家。提交后要改号请联系站长。</p>
        </div>
      )}
      <div>
        <label className={label}>微信号（选填）</label>
        <p className="text-xs text-gray-500">6-20 位、字母开头；或者填能搜到你的手机号</p>
        <input name="wechat_id" maxLength={60} defaultValue={d.wechat_id ?? ""} className={input} />
        <FieldError name="wechat_id" />
      </div>
      {!minimal && <ContactPrefFields methods={d.contact_methods} pref={d.contact_pref} hasWechat={!!d.wechat_id} />}
      {!minimal && (
        <>
          <div>
            <label className={label}>一句话标语（选填，60 字内）</label>
            <input name="tagline" maxLength={60} defaultValue={d.tagline ?? ""} className={input} placeholder="如：15 年中央空调，Katy 很多家都是我装的" />
            <FieldError name="tagline" />
          </div>
          <div>
            <label className={label}>技能标签（最多 6 个，用逗号或空格隔开）</label>
            <input name="sub_tags" defaultValue={d.sub_tags?.join("，") ?? ""} className={input} placeholder="换热水器，通下水道，漏水抢修" />
          </div>
          <fieldset>
            <legend className={label}>语言</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <label key={l} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm">
                  <input type="checkbox" name="languages" value={l} defaultChecked={d.languages?.includes(l) ?? l === "国语"} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_licensed" defaultChecked={d.is_licensed} /> 我有执照（网站会标注“自称有执照 · 未经核实”）
            </label>
            <input name="license_number" maxLength={60} defaultValue={d.license_number ?? ""} className={input} placeholder="执照号（选填）" />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_insured" defaultChecked={d.is_insured} /> 有保险
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="emergency_24h" defaultChecked={d.emergency_24h} /> 24 小时急修
            </label>
          </div>
          <div>
            <label className={label}>收费说明（选填，150 字内）</label>
            <input name="price_note" maxLength={150} defaultValue={d.price_note ?? ""} className={input} placeholder="如：上门检查 $80，修好免检查费" />
          </div>
          <div>
            <label className={label}>简介（选填，300 字内，不要放其他网站链接）</label>
            <textarea name="description" maxLength={300} rows={4} defaultValue={d.description ?? ""} className={input} />
            <FieldError name="description" />
          </div>
        </>
      )}
    </div>
  );
}

/** 顾客怎么联系你：可多选，再选一个最希望的（名片上排第一、高亮） */
function ContactPrefFields({ methods, pref, hasWechat }: { methods?: string[]; pref?: string; hasWechat: boolean }) {
  const checked = methods ?? (hasWechat ? ["phone", "sms", "wechat"] : ["phone", "sms"]);
  const preferred = pref ?? "phone";
  return (
    <fieldset className="rounded-xl border border-gray-200 bg-white p-3">
      <input type="hidden" name="contact_form" value="1" />
      <legend className="px-1 text-sm font-medium text-gray-700">顾客怎么联系你 *</legend>
      <p className="text-xs text-gray-500">可以多选。电话和短信都用上面的号码；加微信要先填微信号。</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONTACT_METHODS.map((m) => (
          <label key={m.id} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-sm">
            <input type="checkbox" name="contact_methods" value={m.id} defaultChecked={checked.includes(m.id)} />
            {m.zh}
          </label>
        ))}
      </div>
      <FieldError name="contact_methods" />
      <p className="mt-3 text-sm font-medium text-gray-700">最希望顾客用哪种？</p>
      <p className="text-xs text-gray-500">名片上这个按钮排第一，并标“偏好…联系”。</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONTACT_METHODS.map((m) => (
          <label key={m.id} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-sm">
            <input type="radio" name="contact_pref" value={m.id} defaultChecked={preferred === m.id} />
            {m.zh}
          </label>
        ))}
      </div>
      <FieldError name="contact_pref" />
    </fieldset>
  );
}
