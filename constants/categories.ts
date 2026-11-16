export interface Category {
  id: string;
  zh: string;
  icon: string;
}

// 12 个分类，首页 3 列 x 4 行
export const CATEGORIES: Category[] = [
  { id: "hvac", zh: "空调暖气", icon: "❄️" },
  { id: "plumbing", zh: "水暖管道", icon: "🚰" },
  { id: "electrical", zh: "电路照明", icon: "💡" },
  { id: "roof", zh: "屋顶防漏", icon: "🏠" },
  { id: "pest", zh: "除虫防治", icon: "🐜" },
  { id: "lawn_fence", zh: "庭院草坪/围栏", icon: "🌿" },
  { id: "appliance", zh: "家电/车库门", icon: "🔧" },
  { id: "handyman", zh: "室内装修/杂修", icon: "🛠️" },
  { id: "moving_ride", zh: "搬家/机场接送", icon: "🚚" },
  { id: "realtor", zh: "房产经纪", icon: "🔑" },
  { id: "mortgage_title", zh: "贷款/Title/过户", icon: "📄" },
  { id: "food", zh: "餐饮美食", icon: "🍜" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function categoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.zh ?? id;
}

export const LANGUAGES = ["国语", "粤语", "English", "台语", "上海话"];
