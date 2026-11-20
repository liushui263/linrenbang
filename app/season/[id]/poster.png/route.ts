import { getVisitorLocation } from "@/lib/location";
import { getSeasonalPicks } from "@/lib/providers";
import { findReminder } from "@/lib/seasonal";
import { seasonalPosterImage } from "@/lib/seasonal-image";

/** 竖版提醒海报：分享页上长按保存，发到微信群。按访客所在城市取推荐师傅 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = findReminder(id);
  if (!r) return new Response("Not found", { status: 404 });
  const loc = await getVisitorLocation();
  const picks = await getSeasonalPicks(loc.city.id, r.categories, 4).catch(() => []);
  return seasonalPosterImage(r, picks, loc.city.zh);
}
