import { MAX_ROTATION_PER_LIST, ROTATION_EPOCH, ROTATION_TIME_ZONE } from "@/constants/site";

/** 当前美国中部时间（America/Chicago）的日期字符串 YYYY-MM-DD */
export function chicagoDateString(now: Date = new Date()): string {
  // en-CA 的格式正好是 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ROTATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 自 2026-01-01 起经过的整数天数（按芝加哥日期算，不受夏令时影响） */
export function dayIndexFor(dateStr: string): number {
  const toUtcDays = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  return Math.round(toUtcDays(dateStr) - toUtcDays(ROTATION_EPOCH));
}

/** 13.1 第 3 步：从轮换池（已按 founding_started_at 升序，最多 10 家）里取当天的 2 家 */
export function pickDailyRotation<T>(pool: readonly T[], dayIndex: number): T[] {
  const n = pool.length;
  if (n === 0) return [];
  if (n <= MAX_ROTATION_PER_LIST) return [...pool];
  const i = ((dayIndex % n) + n) % n;
  return [pool[i], pool[(i + 1) % n]];
}

/**
 * 13.1 第 4 步：首页从各分类当天的轮换结果里聚合，优先挑不同分类的 2 家。
 * 起始分类随 dayIndex 变化，避免永远是同一个分类排第一。
 */
export function pickHomeRotation<T extends { id: string }>(
  perCategory: readonly (readonly T[])[],
  dayIndex: number,
): T[] {
  const nonEmpty = perCategory.filter((list) => list.length > 0);
  if (nonEmpty.length === 0) return [];
  const start = ((dayIndex % nonEmpty.length) + nonEmpty.length) % nonEmpty.length;
  const ordered = [...nonEmpty.slice(start), ...nonEmpty.slice(0, start)];

  const picked: T[] = [];
  // 第一轮：每个分类各取第 1 家
  for (const list of ordered) {
    if (picked.length >= MAX_ROTATION_PER_LIST) break;
    picked.push(list[0]);
  }
  // 不够 2 家时（只有一个分类有轮换池），再从剩下的补
  for (const list of ordered) {
    for (const item of list.slice(1)) {
      if (picked.length >= MAX_ROTATION_PER_LIST) break;
      if (!picked.some((p) => p.id === item.id)) picked.push(item);
    }
  }
  return picked;
}

/** 某个芝加哥日期的起止时间（UTC ISO），用于写 ad_placements.start_at / end_at */
export function chicagoDayBounds(dateStr: string): { start: string; end: string } {
  const offsetAt = (utcMs: number) => {
    // 计算该时刻芝加哥相对 UTC 的偏移（分钟）
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ROTATION_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utcMs));
    const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return (asUtc - utcMs) / 60_000;
  };
  const midnight = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const naive = Date.UTC(y, m - 1, d);
    // 两次修正，处理夏令时切换日
    let guess = naive - offsetAt(naive) * 60_000;
    guess = naive - offsetAt(guess) * 60_000;
    return guess;
  };
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { start: new Date(midnight(dateStr)).toISOString(), end: new Date(midnight(next) - 1000).toISOString() };
}

/** 创始身份是否有效（100 天内） */
export function isFoundingActive(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() > now.getTime();
}

/** 创始剩余天数（向上取整） */
export function foundingDaysLeft(expiresAt: string | null | undefined, now: Date = new Date()): number {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000));
}
