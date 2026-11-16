import { CATEGORY_IDS, LANGUAGES } from "@/constants/categories";
import { CITIES } from "@/constants/cities";
import { toE164 } from "@/lib/phone";
import { validateForm, type FieldErrors } from "@/lib/validate";

export interface ProviderInput {
  name: string;
  category: string;
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
    "category",
    "service_areas",
    ...(includePhone ? ["phone"] : []),
    "wechat_id",
    "tagline",
    "description",
  ]);
  if (Object.keys(fieldErrors).length) return { error: "有几项需要改一下，见红字", fieldErrors };
  const name = str(fd, "name", 60);
  if (!name) return { error: "请填写店名/称呼" };
  const category = String(fd.get("category") ?? "");
  if (!CATEGORY_IDS.includes(category)) return { error: "请选择主营分类" };
  const city_id = String(fd.get("city_id") ?? "houston");
  const city = CITIES.find((c) => c.id === city_id && c.status === "live");
  if (!city) return { error: "服务城市还没开通" };
  const service_areas = fd.getAll("service_areas").map(String).filter((a) => city.areas.includes(a));
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

  return {
    data: {
      name,
      category,
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
