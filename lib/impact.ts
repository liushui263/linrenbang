import { chicagoDateString } from "@/lib/rotation";

export const EVENT_KINDS = ["view", "call", "wechat"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export function isEventKind(x: unknown): x is EventKind {
  return typeof x === "string" && (EVENT_KINDS as readonly string[]).includes(x);
}

/** 爬虫、链接预览（微信/Facebook 抓分享卡片）不算邻居查看 */
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|java\/|go-http|axios|node-fetch/i;
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true;
  return BOT_UA.test(ua);
}

/** “最近 7 天”的起始日期（含今天共 7 天，按芝加哥日期） */
export function impactWindowStart(now: Date = new Date(), days = 7): string {
  const today = chicagoDateString(now);
  const [y, m, d] = today.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - (days - 1) * 86_400_000);
  return start.toISOString().slice(0, 10);
}

export type ImpactCounts = { views: number; calls: number; wechats: number };

/** 推荐人看到的一句话 */
export function impactSentence(name: string, c: ImpactCounts): string {
  if (c.views === 0 && c.calls === 0 && c.wechats === 0) {
    return `你推荐的${name}，最近 7 天还没有邻居来看。转发一下，帮更多邻居找到靠谱师傅。`;
  }
  const parts = [`被 ${c.views} 位邻居查看`];
  if (c.calls > 0) parts.push(`${c.calls} 位拨打`);
  if (c.wechats > 0) parts.push(`${c.wechats} 位加微信`);
  return `你推荐的${name}，最近 7 天${parts.join("、")}。`;
}

/** 推荐人转发到微信群时带的文字 */
export function impactShareLines(name: string, category: string, c: ImpactCounts): string[] {
  const contacted = c.calls + c.wechats;
  const stat =
    c.views > 0
      ? `最近 7 天已有 ${c.views} 位邻居查看${contacted > 0 ? `、${contacted} 次联系` : ""}。`
      : "";
  return [`我在邻人帮推荐了${name}（${category}），用过觉得靠谱。${stat}`, "有需要的邻居可以看看真实推荐："];
}
