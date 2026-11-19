import { CATEGORIES } from "@/constants/categories";

/**
 * 搜索同义词：邻居习惯的叫法 → 站内分类名、商家/推荐里常见的写法。
 * 只做“扩展”，原词永远保留。命中任意一个词就算匹配（部分匹配，不要求整词）。
 */
const SYNONYMS: Record<string, string[]> = {
  水电: ["水管", "水暖", "管道", "电路", "电线", "照明"],
  水管: ["水暖", "管道", "漏水"],
  管道: ["水管", "水暖", "下水"],
  下水道: ["管道", "堵", "疏通"],
  通下水: ["管道", "堵", "疏通"],
  热水器: ["水暖", "管道"],
  电工: ["电路", "电线", "照明"],
  电线: ["电路", "电工"],
  灯: ["照明", "电路"],
  空调: ["暖气", "冷气", "AC", "HVAC"],
  冷气: ["空调", "AC"],
  暖气: ["空调", "heater"],
  AC: ["空调", "冷气"],
  漏水: ["屋顶", "防漏", "水管"],
  房顶: ["屋顶"],
  屋顶: ["房顶", "roof"],
  装修: ["杂修", "翻新"],
  杂活: ["杂修", "装修"],
  维修: ["杂修", "装修"],
  修理: ["杂修", "装修"],
  除虫: ["虫", "白蚁", "蟑螂"],
  白蚁: ["除虫", "虫"],
  草坪: ["庭院", "割草", "园艺"],
  割草: ["草坪", "庭院"],
  围栏: ["篱笆", "fence"],
  车库门: ["车库", "garage"],
  搬家: ["搬运", "moving"],
  接送: ["机场", "接机"],
  接机: ["机场", "接送"],
  经纪: ["房产", "realtor", "买房", "卖房"],
  地产: ["房产", "经纪"],
  买房: ["房产", "经纪", "贷款"],
  贷款: ["过户", "mortgage"],
  报税: ["税务", "会计"],
  会计: ["税务", "报税"],
  保险: ["财务", "insurance"],
  吃饭: ["餐饮", "美食", "餐馆"],
  餐馆: ["餐饮", "美食", "饭店"],
  外卖: ["餐饮", "美食"],
};

const MAX_TERM_LEN = 30;
const MAX_TERMS = 10;

/** 去掉 PostgREST or() 语法和 LIKE 通配里有特殊含义的字符 */
export function sanitizeTerm(raw: string): string {
  return raw
    .replace(/[%,()*"\\:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TERM_LEN);
}

/** 把用户输入拆成关键词（空格分隔）并加上同义词，去重后最多 10 个 */
export function expandSearchTerms(q: string): string[] {
  const base = sanitizeTerm(q)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean);
  const out: string[] = [];
  const push = (t: string) => {
    const s = sanitizeTerm(t);
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  };
  base.forEach(push);
  for (const t of base) {
    const key = Object.keys(SYNONYMS).find((k) => k.toLowerCase() === t.toLowerCase());
    if (key) SYNONYMS[key].forEach(push);
  }
  return out.slice(0, MAX_TERMS);
}

/** 分类名里包含任一关键词的分类（如“水” → 水暖管道，“电” → 电路照明、家电/车库门） */
export function matchingCategoryIds(terms: string[]): string[] {
  const lower = terms.map((t) => t.toLowerCase());
  return CATEGORIES.filter((c) => lower.some((t) => c.zh.toLowerCase().includes(t) || c.id === t)).map((c) => c.id);
}
