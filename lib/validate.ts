/** 前后端共用的字段校验：返回错误文字，没问题返回 null */
import { MAX_CATEGORIES, OTHER_CATEGORY } from "@/constants/categories";
import { CONTACT_METHOD_IDS } from "@/constants/site";
import { toE164 } from "@/lib/phone";

export type FieldErrors = Record<string, string>;

const LINK = /(https?:\/\/|www\.)/i;

/** 表单里选中的分类（去重，主营 primary_category 排第一）；兼容旧的单个 category 字段 */
export function selectedCategories(fd: FormData): string[] {
  const list = fd.getAll("categories").map((x) => String(x).trim());
  if (list.length === 0 && fd.get("category")) list.push(String(fd.get("category")).trim());
  const primary = String(fd.get("primary_category") ?? "").trim();
  if (primary && list.includes(primary)) list.unshift(primary);
  return [...new Set(list.filter(Boolean))];
}

export function validateField(name: string, fd: FormData): string | null {
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  switch (name) {
    case "name":
      return v("name") ? null : "请填写店名或称呼";
    case "categories": {
      const n = selectedCategories(fd).length;
      if (n === 0) return "请至少选一个分类";
      return n > MAX_CATEGORIES ? `最多选 ${MAX_CATEGORIES} 个分类` : null;
    }
    case "custom_service": {
      if (!selectedCategories(fd).includes(OTHER_CATEGORY)) return null;
      const c = v("custom_service");
      if (c.length < 2) return "选了“其他服务”，请写一下具体做什么（2-12 个字，如：网站设计）";
      if (c.length > 12) return "服务名请控制在 12 个字以内";
      return LINK.test(c) ? "服务名里不要放网址" : null;
    }
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
    // 联系方式偏好：只有表单里有这一组（contact_form=1）时才校验；邻居代录入不填，用默认值
    case "contact_methods": {
      if (!fd.get("contact_form")) return null;
      const m = fd.getAll("contact_methods").map(String).filter((x) => CONTACT_METHOD_IDS.includes(x));
      if (m.length === 0) return "请至少选一种顾客联系你的方式";
      if (m.includes("wechat") && !v("wechat_id")) return "选了“加微信”，请在上面填微信号";
      return null;
    }
    case "contact_pref": {
      if (!fd.get("contact_form")) return null;
      const m = fd.getAll("contact_methods").map(String);
      const p = v("contact_pref");
      if (!p) return "请选一个你最希望顾客用的方式";
      return m.includes(p) ? null : "最希望的方式要先在上面勾选";
    }
    case "description":
      return LINK.test(v("description")) ? "简介里不要放网址链接" : null;
    case "tagline":
      return LINK.test(v("tagline")) ? "标语里不要放网址链接" : null;
    case "recommender_area":
      return v("recommender_area") ? null : "请选择你住的片区";
    case "comment":
      return v("comment").length >= 5 ? null : "推荐理由至少写一句具体的事（修了什么、多少钱、多快）";
    // 匿名快速推荐的“服务内容”：做什么 + 一句推荐
    case "service": {
      const s = v("service");
      if (s.length < 2) return "请写一下他做什么，比如：修空调，上门快、价格公道";
      return LINK.test(s) ? "这里不要放网址链接" : null;
    }
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
