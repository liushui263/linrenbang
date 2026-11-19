export type CityStatus = "live" | "coming_soon";

export interface City {
  id: string;
  zh: string;
  en: string;
  zipPrefixes: string[];
  status: CityStatus;
  areas: string[]; // 片区，按城市配，不共用
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
