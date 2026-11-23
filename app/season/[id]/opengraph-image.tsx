import { getCity } from "@/constants/cities";
import { SEASONAL_REMINDERS } from "@/constants/seasonal";
import { getSeasonalPicks } from "@/lib/providers";
import { findReminder } from "@/lib/seasonal";
import { seasonalOgImage } from "@/lib/seasonal-image";

// 微信/朋友圈分享卡片的大图（1200×630）。分享出去的人不一定在休斯顿，用默认城市的推荐
export const alt = "邻人帮季节提醒";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// 画图很费 CPU：每条提醒的图生成一次存起来，1 小时后才在后台重画（师傅排名变化不用秒级更新）
export const revalidate = 3600;

export function generateStaticParams() {
  return SEASONAL_REMINDERS.map((r) => ({ id: r.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = findReminder(id);
  if (!r) return new Response("Not found", { status: 404 });
  const picks = await getSeasonalPicks(getCity(null).id, r.categories, 3).catch(() => []);
  return seasonalOgImage(r, picks);
}
