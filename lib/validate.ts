/** 前后端共用的字段校验：返回错误文字，没问题返回 null */
import { toE164 } from "@/lib/phone";

export type FieldErrors = Record<string, string>;

const LINK = /(https?:\/\/|www\.)/i;

export function validateField(name: string, fd: FormData): string | null {
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  switch (name) {
    case "name":
      return v("name") ? null : "请填写店名或称呼";
    case "category":
      return v("category") ? null : "请选择主营分类";
    case "service_areas":
      return fd.getAll("service_areas").length > 0 ? null : "请至少选一个覆盖片区";
    case "phone":
      return toE164(v("phone")) ? null : "请填 10 位美国电话，例如 (713) 555-0123";
    case "wechat_id": {
      const w = v("wechat_id");
      if (!w) return null;
      // 标准微信号：6-20 位、字母开头；也接受用手机号加微信
      if (/^[A-Za-z][A-Za-z0-9_-]{5,19}$/.test(w) || /^\+?\d{6,15}$/.test(w)) return null;
      return "微信号是 6-20 位、字母开头（字母、数字、下划线、横线），或者填能搜到你的手机号";
    }
    case "description":
      return LINK.test(v("description")) ? "简介里不要放网址链接" : null;
    case "tagline":
      return LINK.test(v("tagline")) ? "标语里不要放网址链接" : null;
    case "recommender_area":
      return v("recommender_area") ? null : "请选择你住的片区";
    case "comment":
      return v("comment").length >= 5 ? null : "推荐理由至少写一句具体的事（修了什么、多少钱、多快）";
    case "contact_note":
      return v("contact_note").length >= 2 ? null : "请留一个站长能联系到你的方式（微信号或方便的时间）";
    case "avatar":
    case "license_photo": {
      const f = fd.get(name);
      if (!f || typeof f === "string" || f.size === 0) return null;
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return "图片只支持 JPG / PNG / WebP（iPhone 的 HEIC 请先截图或转成 JPG）";
      if (f.size > 5 * 1024 * 1024) return "图片不能超过 5MB";
      return null;
    }
    default:
      return null;
  }
}

/** 校验表单里出现过的所有字段 */
export function validateForm(fd: FormData, names: string[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const n of names) {
    const e = validateField(n, fd);
    if (e) errors[n] = e;
  }
  return errors;
}
