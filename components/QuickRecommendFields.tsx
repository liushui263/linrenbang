import { HONEYPOT_FIELD } from "@/lib/anon-recommend";
import { FieldError } from "./ActionForm";
import ContactImagePicker from "./ContactImagePicker";

const input = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2";
const label = "block text-sm font-medium text-gray-700";

/** 不用登录的快速推荐：名字 / 电话 / 服务内容（给已有商家写推荐时只要服务内容） */
export default function QuickRecommendFields({ withProvider = true, phone }: { withProvider?: boolean; phone?: string }) {
  return (
    <div className="space-y-4">
      {withProvider && (
        <>
          <div>
            <label className={label}>店名或师傅怎么称呼 *</label>
            <input name="name" required maxLength={60} className={input} placeholder="如：王师傅 / 老王空调" />
            <FieldError name="name" />
          </div>
          <div className="space-y-2">
            <label className={label}>怎么找到他 *</label>
            <input
              name="contact"
              maxLength={200}
              defaultValue={phone ?? ""}
              className={input}
              placeholder="电话、微信号、邮箱或网址，填一个就行"
            />
            <ContactImagePicker />
            <FieldError name="contact" />
            <p className="text-xs text-gray-500">群里看到的广告、名片，截图传上来就行。有电话的话，网站上已有这位师傅会自动算到他名下。</p>
          </div>
        </>
      )}
      <div>
        <label className={label}>{withProvider ? "做什么服务 *" : "他帮你做了什么 *"}</label>
        <textarea
          name="service"
          required
          maxLength={300}
          rows={3}
          className={input}
          placeholder="如：修空调，夏天当天就上门，价格公道"
        />
        <FieldError name="service" />
      </div>
      {/* 防机器人：真人看不到这个框，机器人会填 */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          网站（不用填）
          <input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <p className="text-xs text-gray-500">不用登录。站长审核通过后展示；乱填、刷单、自荐会被隐藏。</p>
    </div>
  );
}
