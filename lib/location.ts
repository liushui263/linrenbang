import "server-only";
import { cookies } from "next/headers";
import { CITY_NOTICE_COOKIE, cityForZip, getCity, isValidZip, type City } from "@/constants/cities";

export const ZIP_COOKIE = "lrb_zip";
export const AREA_COOKIE = "lrb_area";

export interface VisitorLocation {
  zip: string | null; // 用户输入过的 Zip
  hasChosen: boolean; // 是否已经输入或跳过（决定要不要弹首次 Zip 提示）
  city: City; // 当前查看的城市
  zipCity: City | null; // Zip 对应的已开通城市；null 表示没开通
  area: string | null; // 访客片区
  cityNoticeDismissed: boolean; // 访客已经关掉了这个 Zip 的“没开通”提示
}

export async function getVisitorLocation(): Promise<VisitorLocation> {
  const store = await cookies();
  const raw = store.get(ZIP_COOKIE)?.value ?? null;
  const zip = raw && isValidZip(raw) ? raw : null;
  const zipCity = zip ? cityForZip(zip) : null;
  const city = zipCity ?? getCity(null); // 没开通的 Zip 继续看休斯顿
  const areaRaw = store.get(AREA_COOKIE)?.value ?? null;
  const area = areaRaw && city.areas.includes(areaRaw) ? areaRaw : null;
  const cityNoticeDismissed = !!zip && store.get(CITY_NOTICE_COOKIE)?.value === zip;
  return { zip, hasChosen: raw !== null, city, zipCity, area, cityNoticeDismissed };
}
