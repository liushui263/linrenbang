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

/**
 * 首页的 8 个大类：只是展示用的分组，数据库里商家仍然存 15 个细分类之一。
 * 前 HOME_GROUP_COUNT 个直接显示在首页，其余放在“查看全部分类”里。
 * 只含 1 个细分类的大类，点了直接进那个分类，不再多选一次。
 */
export interface CategoryGroup {
  id: string;
  zh: string;
  icon: string;
  tint: string;
  /** 大类卡片下面的小字，说明包含哪些细分类 */
  hint: string;
  categories: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: "home_repair", zh: "房屋维修", icon: "❄️", tint: "#e0f2fe", hint: "空调·水暖·电路·屋顶", categories: ["hvac", "plumbing", "electrical", "roof"] },
  { id: "renovation", zh: "家居装修", icon: "🔧", tint: "#e0e7ff", hint: "装修·家电·车库门·杂修", categories: ["handyman", "appliance"] },
  { id: "yard_pest", zh: "庭院虫害", icon: "🌿", tint: "#dcfce7", hint: "草坪·围栏·园艺·除虫", categories: ["lawn_fence", "pest"] },
  { id: "moving", zh: "搬家交通", icon: "🚚", tint: "#fef3c7", hint: "搬家·机场接送·运输", categories: ["moving_ride"] },
  { id: "real_estate", zh: "房产服务", icon: "🏠", tint: "#ede9fe", hint: "经纪·贷款·过户", categories: ["realtor", "mortgage_title"] },
  { id: "food", zh: "餐饮美食", icon: "🍜", tint: "#ffedd5", hint: "中餐·外卖·餐饮推荐", categories: ["food"] },
  { id: "finance", zh: "财税保险", icon: "🧾", tint: "#ccfbf1", hint: "税务·财务·保险", categories: ["tax", "finance_insurance"] },
  { id: "other", zh: "其他服务", icon: "⭐", tint: "#fef3c7", hint: "其他生活及专业服务", categories: ["other"] },
];

export const HOME_GROUP_COUNT = 6;

export const CATEGORY_GROUP_IDS = CATEGORY_GROUPS.map((g) => g.id);

export function findGroup(id: string | undefined): CategoryGroup | undefined {
  return id ? CATEGORY_GROUPS.find((g) => g.id === id) : undefined;
}

/** 细分类所属的大类 */
export function groupOfCategory(categoryId: string | undefined): CategoryGroup | undefined {
  return categoryId ? CATEGORY_GROUPS.find((g) => g.categories.includes(categoryId)) : undefined;
}

export function categoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.zh ?? id;
}

/** 商家在名片上显示的分类：“其他服务”显示商家自己填的服务名 */
export function providerCategoryLabel(p: { category: string; custom_service?: string | null }): string {
  if (p.category === OTHER_CATEGORY && p.custom_service?.trim()) return p.custom_service.trim();
  return categoryName(p.category);
}

export const LANGUAGES = ["国语", "粤语", "English", "台语", "上海话"];
