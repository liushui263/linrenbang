export interface Category {
  id: string;
  zh: string;
  icon: string;
  /** 首页分类卡片图标后面的浅色圆底 */
  tint: string;
}

// 14 个固定分类 + “其他服务”，首页手机 3 列、电脑 4 列
export const CATEGORIES: Category[] = [
  { id: "hvac", zh: "空调暖气", icon: "❄️", tint: "#e0f2fe" },
  { id: "plumbing", zh: "水暖管道", icon: "🚰", tint: "#e0f2fe" },
  { id: "electrical", zh: "电路照明", icon: "💡", tint: "#fef9c3" },
  { id: "roof", zh: "屋顶防漏", icon: "🏠", tint: "#fee2e2" },
  { id: "pest", zh: "除虫防治", icon: "🐜", tint: "#ffedd5" },
  { id: "lawn_fence", zh: "庭院草坪/围栏", icon: "🌿", tint: "#dcfce7" },
  { id: "appliance", zh: "家电/车库门", icon: "🔧", tint: "#e0e7ff" },
  { id: "handyman", zh: "室内装修/杂修", icon: "🛠️", tint: "#e0f2fe" },
  { id: "moving_ride", zh: "搬家/机场接送", icon: "🚚", tint: "#fef3c7" },
  { id: "realtor", zh: "房产经纪", icon: "🏡", tint: "#ede9fe" },
  { id: "mortgage_title", zh: "贷款/过户", icon: "📝", tint: "#dbeafe" },
  { id: "food", zh: "餐饮美食", icon: "🍜", tint: "#ffedd5" },
  { id: "tax", zh: "税务规划", icon: "🧾", tint: "#ccfbf1" },
  { id: "finance_insurance", zh: "财务保险", icon: "🛡️", tint: "#d1fae5" },
  // 放最后：商家必须填一个简短服务名（custom_service），名片上显示服务名而不是“其他”
  { id: "other", zh: "其他服务", icon: "⭐", tint: "#fef3c7" },
];

export const OTHER_CATEGORY = "other";

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function categoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.zh ?? id;
}

/** 一个商家最多选几个分类 */
export const MAX_CATEGORIES = 3;

type HasCategories = { category: string; categories?: string[] | null; custom_service?: string | null };

/** 商家的全部分类（第一个是主营）。兼容还没有 categories 的旧数据 */
export function providerCategories(p: HasCategories): string[] {
  return p.categories?.length ? p.categories : [p.category];
}

/** 每个分类在名片上的名字：“其他服务”显示商家自己填的服务名 */
export function providerCategoryLabels(p: HasCategories): string[] {
  return providerCategories(p).map((id) =>
    id === OTHER_CATEGORY && p.custom_service?.trim() ? p.custom_service.trim() : categoryName(id),
  );
}

/** 一行文字版（分享标题、审核列表等）：“空调暖气、水暖管道” */
export function providerCategoryLabel(p: HasCategories): string {
  return providerCategoryLabels(p).join("、");
}

export const LANGUAGES = ["国语", "粤语", "English", "台语", "上海话"];
