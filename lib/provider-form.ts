import { CATEGORY_IDS, LANGUAGES, MAX_CATEGORIES, OTHER_CATEGORY } from "@/constants/categories";
import { CITIES, cleanServiceAreas } from "@/constants/cities";
import { CONTACT_METHOD_IDS, type ContactMethod } from "@/constants/site";
import { toE164 } from "@/lib/phone";
import { selectedCategories, validateForm, type FieldErrors } from "@/lib/validate";

export interface ProviderInput {
  name: string;
  /** 主营分类 = categories[0] */
  category: string;
  categories: string[];
  custom_service: string | null;
  city_id: string;
  service_areas: string[];
  phone: string;
  wechat_id: string | null;
  tagline: string | null;
  sub_tags: string[];
  languages: string[];
  is_licensed: boolean;
  license_number: string | null;
  is_insured: boolean;
  emergency_24h: boolean;
  price_note: string | null;
  description: string | null;
  contact_methods: ContactMethod[];
  contact_pref: ContactMethod;
}

const str = (fd: FormData, k: string, max: number) => {
  const v = String(fd.get(k) ?? "").trim();
  return v ? v.slice(0, max) : null;
};

/** 解析并校验商家表单（注册 / 代录入 / 编辑共用）。includePhone=false 用于编辑（电话不可改） */
export function parseProviderForm(
  fd: FormData,
  includePhone = true,
): { data?: ProviderInput; error?: string; fieldErrors?: FieldErrors } {
  const fieldErrors = validateForm(fd, [
    "name",
    "categories",
    "custom_service",
    "service_areas",
    ...(includePhone ? ["phone"] : []),
    "wechat_id",
    "contact_methods",
    "contact_pref",
    "tagline",
    "description",
  ]);
  if (Object.keys(fieldErrors).length) return { error: "有几项需要改一下，见红字", fieldErrors };
  const name = str(fd, "name", 60);
  if (!name) return { error: "请填写店名/称呼" };
  const categories = selectedCategories(fd).filter((c) => CATEGORY_IDS.includes(c));
  if (categories.length === 0) return { error: "请至少选一个分类", fieldErrors: { categories: "请至少选一个分类" } };
  if (categories.length > MAX_CATEGORIES) {
    return { error: `最多选 ${MAX_CATEGORIES} 个分类`, fieldErrors: { categories: `最多选 ${MAX_CATEGORIES} 个分类` } };
  }
  const category = categories[0];
  const city_id = String(fd.get("city_id") ?? "houston");
  const city = CITIES.find((c) => c.id === city_id && c.status === "live");
  if (!city) return { error: "服务城市还没开通" };
  const service_areas = cleanServiceAreas(city, fd.getAll("service_areas").map(String));
  if (service_areas.length === 0) return { error: "请至少选一个覆盖片区" };

  let phone = "";
  if (includePhone) {
    const p = toE164(String(fd.get("phone") ?? ""));
    if (!p) return { error: "电话格式不对，请填 10 位美国号码" };
    phone = p;
  }

  const sub_tags = String(fd.get("sub_tags") ?? "")
    .split(/[,，、\s]+/)
    .map((t) => t.trim().slice(0, 12))
    .filter(Boolean)
    .slice(0, 6);
  const languages = fd.getAll("languages").map(String).filter((l) => LANGUAGES.includes(l));
  const wechat = str(fd, "wechat_id", 60);
  const description = str(fd, "description", 300);

  // 联系方式：表单里有这一组就按商家选的；没有（邻居代录入）就默认电话 + 短信，有微信号再加微信
  let contact_methods: ContactMethod[];
  let contact_pref: ContactMethod;
  if (fd.get("contact_form")) {
    const picked = fd.getAll("contact_methods").map(String).filter((m) => CONTACT_METHOD_IDS.includes(m));
    contact_methods = CONTACT_METHOD_IDS.filter((m) => picked.includes(m) && (m !== "wechat" || wechat)) as ContactMethod[];
    if (contact_methods.length === 0) return { error: "请至少选一种顾客联系你的方式" };
    const pref = String(fd.get("contact_pref") ?? "") as ContactMethod;
    contact_pref = contact_methods.includes(pref) ? pref : contact_methods[0];
  } else {
    contact_methods = wechat ? ["phone", "sms", "wechat"] : ["phone", "sms"];
    contact_pref = "phone";
  }

  return {
    data: {
      name,
      category,
      categories,
      custom_service: categories.includes(OTHER_CATEGORY) ? str(fd, "custom_service", 12) : null,
      city_id,
      service_areas,
      phone,
      wechat_id: wechat,
      tagline: str(fd, "tagline", 60),
      sub_tags,
      languages,
      is_licensed: fd.get("is_licensed") === "on",
      license_number: str(fd, "license_number", 60),
      is_insured: fd.get("is_insured") === "on",
      emergency_24h: fd.get("emergency_24h") === "on",
      price_note: str(fd, "price_note", 150),
      description,
      contact_methods,
      contact_pref,
    },
  };
}

export interface RecommendationInput {
  recommender_area: string;
  service_item: string | null;
  cost_approx: string | null;
  comment: string;
}

export function parseRecommendationForm(fd: FormData): { data?: RecommendationInput; error?: string; fieldErrors?: FieldErrors } {
  const fieldErrors = validateForm(fd, ["recommender_area", "comment"]);
  if (Object.keys(fieldErrors).length) return { error: "有几项需要改一下，见红字", fieldErrors };
  const area = str(fd, "recommender_area", 40);
  if (!area) return { error: "请选择你住的片区" };
  const comment = str(fd, "comment", 300);
  if (!comment || comment.length < 5) return { error: "推荐理由至少写一句具体的事（修了什么、多少钱、多快）" };
  return {
    data: {
      recommender_area: area,
      service_item: str(fd, "service_item", 60),
      cost_approx: str(fd, "cost_approx", 40),
      comment,
    },
  };
}
