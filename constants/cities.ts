export type CityStatus = "live" | "coming_soon";

export interface City {
  id: string;
  zh: string;
  en: string;
  zipPrefixes: string[];
  status: CityStatus;
  areas: string[]; // 片区，按城市配，不共用
}

export const CITIES: City[] = [
  {
    id: "houston",
    zh: "休斯顿",
    en: "Houston",
    zipPrefixes: ["770", "771", "772", "773", "774", "775"],
    status: "live",
    areas: ["Katy", "Sugar Land", "Chinatown", "Cypress", "Woodlands", "Pearland", "Clear Lake", "Inner Loop"],
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
