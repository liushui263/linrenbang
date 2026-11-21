export type CityStatus = "live" | "coming_soon";

export interface City {
  id: string;
  zh: string;
  en: string;
  zipPrefixes: string[];
  status: CityStatus;
  areas: string[]; // 片区，按城市配，不共用
  /** 片区全选时的统称，如“大休斯顿地区” */
  metroZh: string;
  /** 每个片区一个代表 Zip：没开通城市的访客点一下就切过来 */
  areaZips: Record<string, string>;
}

export const CITIES: City[] = [
  {
    id: "houston",
    zh: "休斯顿",
    en: "Houston",
    zipPrefixes: ["770", "771", "772", "773", "774", "775"],
    status: "live",
    metroZh: "大休斯顿地区",
    areas: ["Katy", "Sugar Land", "Chinatown", "Cypress", "Woodlands", "Pearland", "Clear Lake", "Inner Loop"],
    areaZips: {
      Katy: "77494",
      "Sugar Land": "77479",
      Chinatown: "77036",
      Cypress: "77433",
      Woodlands: "77380",
      Pearland: "77584",
      "Clear Lake": "77058",
      "Inner Loop": "77002",
    },
  },
  // 以后加城市只加一行，status 先写 "coming_soon"
];

export const DEFAULT_CITY_ID = "houston";

export function getCity(id: string | undefined | null): City {
  return CITIES.find((c) => c.id === id) ?? CITIES.find((c) => c.id === DEFAULT_CITY_ID)!;
}

/**
 * 不分地点的服务（网页制作、线上课程、远程记账等）：库里 service_areas 存这个值，
 * 访客不管选哪个片区都能看到。和片区互斥：选了它就只存它一个。
 */
export const ANYWHERE_AREA = "Anywhere";
export const ANYWHERE_ZH = "不限地区（线上/远程服务）";

/** 表单提交的服务区域：只留这个城市的片区；选了“不限地区”就只存它 */
export function cleanServiceAreas(city: City | undefined | null, raw: string[]): string[] {
  if (raw.includes(ANYWHERE_AREA)) return [ANYWHERE_AREA];
  return raw.filter((a) => city?.areas.includes(a));
}

/** 服务区域显示：不限地区；该城市片区全选时只显示统称（如“大休斯顿地区”）；否则列片区名 */
export function formatServiceAreas(cityId: string | undefined | null, areas: string[], sep = ", "): string {
  if (areas.includes(ANYWHERE_AREA)) return ANYWHERE_ZH;
  const city = getCity(cityId);
  if (city.areas.length > 0 && city.areas.every((a) => areas.includes(a))) return city.metroZh;
  return areas.join(sep);
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/** Zip → 已开通城市；没开通返回 null */
export function cityForZip(zip: string): City | null {
  if (!isValidZip(zip)) return null;
  return CITIES.find((c) => c.status === "live" && c.zipPrefixes.some((p) => zip.startsWith(p))) ?? null;
}

/** 关掉“城市没开通”提示后记下是哪个 Zip；换成别的没开通 Zip 会再提示一次 */
export const CITY_NOTICE_COOKIE = "lrb_notice_off";

/** 离这个 Zip 最近的已开通城市（按 Zip 前三位的数字差粗略排序） */
export function nearbyLiveCities(zip: string, limit = 3): City[] {
  const n = Number(zip.slice(0, 3));
  const dist = (c: City) => Math.min(...c.zipPrefixes.map((p) => Math.abs(Number(p) - n)));
  return CITIES.filter((c) => c.status === "live")
    .sort((a, b) => dist(a) - dist(b))
    .slice(0, limit);
}
