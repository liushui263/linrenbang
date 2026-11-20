import { SEASONAL_REMINDERS, type SeasonalReminder } from "@/constants/seasonal";
import { chicagoDateString } from "@/lib/rotation";

/** 当前美国中部时间的月份（1-12） */
export function chicagoMonth(now: Date = new Date()): number {
  return Number(chicagoDateString(now).slice(5, 7));
}

/** 这个月该显示的提醒，按配置文件里的顺序（第一条上首页大卡片） */
export function remindersForMonth(month: number, list: readonly SeasonalReminder[] = SEASONAL_REMINDERS): SeasonalReminder[] {
  return list.filter((r) => r.enabled && r.months.includes(month));
}

export function currentReminders(now: Date = new Date()): SeasonalReminder[] {
  return remindersForMonth(chicagoMonth(now));
}

/** 分享页用：按 id 找（不限月份，过季的链接也能打开） */
export function findReminder(id: string): SeasonalReminder | undefined {
  return SEASONAL_REMINDERS.find((r) => r.id === id && r.enabled);
}

/** “6、7、8、9 月” → “6–9 月”；跨年的 “12、1、2 月” → “12–2 月” */
export function monthsLabel(months: readonly number[]): string {
  if (months.length === 0) return "";
  const contiguous = months.every((m, i) => i === 0 || m === (months[i - 1] % 12) + 1);
  if (contiguous && months.length > 2) return `${months[0]}–${months[months.length - 1]} 月`;
  return `${months.join("、")} 月`;
}
