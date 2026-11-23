import type { NextRequest } from "next/server";
import { CITIES, getCity } from "@/constants/cities";
import { getSeasonalPicks } from "@/lib/providers";
import { findReminder } from "@/lib/seasonal";
import { seasonalPosterImage } from "@/lib/seasonal-image";

/**
 * 竖版提醒海报：分享页上长按保存，发到微信群。
 * 城市从 ?city= 取（分享页按访客城市填好），不读 cookie，这样同一城市的海报可以走 CDN 缓存，
 * 不用每个访客都重新画一遍（画图很费 CPU）。
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = findReminder(id);
  if (!r) return new Response("Not found", { status: 404 });
  const cityParam = req.nextUrl.searchParams.get("city");
  const city = getCity(CITIES.some((c) => c.id === cityParam && c.status === "live") ? cityParam : null);
  const picks = await getSeasonalPicks(city.id, r.categories, 4).catch(() => []);
  return seasonalPosterImage(r, picks, city.zh);
}
