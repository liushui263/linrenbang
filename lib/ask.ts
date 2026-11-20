/** 求推荐：前后端共用的常量、校验和小工具（不访问数据库，方便单元测试） */
import { CATEGORIES, CATEGORY_GROUPS, findGroup } from "@/constants/categories";

export const ASK_TITLE_MAX = 40;
export const ASK_DETAILS_MAX = 300;
export const ANSWER_COMMENT_MIN = 10;
export const ANSWER_COMMENT_MAX = 300;
/** 每个账号 24 小时内最多发几条求推荐（防刷屏） */
export const ASKS_PER_DAY = 3;
/** 已解决的提问多少天后从列表里收起（详情页还能打开） */
export const CLOSED_FOLD_DAYS = 30;
/** 首页显示几条 */
export const HOME_ASK_COUNT = 3;
export const ASK_PAGE_SIZE = 20;

export type Urgency = "flexible" | "week" | "today";
export const URGENCIES: { id: Urgency; zh: string }[] = [
  { id: "flexible", zh: "不急" },
  { id: "week", zh: "这周内" },
  { id: "today", zh: "今天就要 🔥" },
];
export const urgencyName = (u: string) => URGENCIES.find((x) => x.id === u)?.zh ?? "";

export interface AskInput {
  title: string;
  details: string | null;
  category_group: string;
  category: string | null;
  area: string;
  urgency: Urgency;
}

export interface PublicAsk {
  id: string;
  city_id: string;
  area: string;
  category_group: string;
  category: string | null;
  title: string;
  details: string | null;
  urgency: Urgency;
  status: "open" | "closed";
  answer_count: number;
  chosen_provider_id: string | null;
  closed_at: string | null;
  created_at: string;
}

export const PUBLIC_ASK_COLUMNS =
  "id, city_id, area, category_group, category, title, details, urgency, status, answer_count, chosen_provider_id, closed_at, created_at";

const LINK = /(https?:\/\/|www\.|\.com\b)/i;
/** 7 位以上连续数字（允许中间有空格、横线、括号、点）= 像电话号码 */
const PHONE_LIKE = /(?:\d[\s\-().]*){7,}/;
/** 微信号：不让在提问里留联系方式（加微信 xxx、vx: xxx） */
const WECHAT_LIKE = /(微信|vx|v信|wechat|weixin)\s*[:：号]?\s*[A-Za-z][A-Za-z0-9_-]{5,}/i;

export function containsContact(text: string): boolean {
  return LINK.test(text) || PHONE_LIKE.test(text) || WECHAT_LIKE.test(text);
}

/** 从搜索词生成提问标题：“泳池清洁” → “求推荐：泳池清洁” */
export function titleFromSearch(q: string | undefined | null): string {
  const t = (q ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return `求推荐：${t}`.slice(0, ASK_TITLE_MAX);
}

/** 解析并校验发帖表单。areas = 当前城市的片区 */
export function parseAskForm(
  fd: FormData,
  areas: string[],
): { data?: AskInput; fieldErrors?: Record<string, string> } {
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  const errs: Record<string, string> = {};

  const title = v("title").replace(/\s+/g, " ");
  if (title.length < 4) errs.title = "请用一句话说清楚要找什么（至少 4 个字）";
  else if (title.length > ASK_TITLE_MAX) errs.title = `标题最多 ${ASK_TITLE_MAX} 个字，细节写到下面的补充说明里`;
  else if (containsContact(title)) errs.title = "不要在提问里留电话、微信或网址";

  const details = v("details");
  if (details.length > ASK_DETAILS_MAX) errs.details = `补充说明最多 ${ASK_DETAILS_MAX} 个字`;
  else if (details && containsContact(details)) errs.details = "不要在提问里留电话、微信或网址，邻居会在下面回答你";

  const group = findGroup(v("category_group"));
  if (!group) errs.category_group = "请选一个分类";
  const cat = v("category");
  const category = group && cat && group.categories.includes(cat) ? cat : null;

  const area = v("area");
  if (!areas.includes(area)) errs.area = "请选你住的片区";

  const u = v("urgency");
  const urgency: Urgency = u === "flexible" || u === "today" ? u : "week";

  if (Object.keys(errs).length) return { fieldErrors: errs };
  return {
    data: {
      title,
      details: details || null,
      category_group: group!.id,
      // 只有一个细分类的大类（如餐饮美食），细分类就是它
      category: category ?? (group!.categories.length === 1 ? group!.categories[0] : null),
      area,
      urgency,
    },
  };
}

export function validateAnswerComment(comment: string): string | null {
  const c = comment.trim();
  if (c.length < ANSWER_COMMENT_MIN) return `说说你的经历，至少 ${ANSWER_COMMENT_MIN} 个字（什么时候找的、做了什么、价格怎么样）`;
  if (c.length > ANSWER_COMMENT_MAX) return `最多 ${ANSWER_COMMENT_MAX} 个字`;
  if (containsContact(c)) return "不用写电话或微信，师傅的联系方式会显示在名片上";
  return null;
}

/** “25 分钟前 / 3 小时前 / 昨天 / 5 天前 / 3月2日” */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d === 1) return "昨天";
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", timeZone: "America/Chicago" });
}

export function groupLabel(id: string): string {
  const g = CATEGORY_GROUPS.find((x) => x.id === id);
  return g ? `${g.icon} ${g.zh}` : "";
}

/** 提问卡片上的分类：选了细分类显示细分类，否则显示大类 */
export function askCategoryLabel(a: { category_group: string; category: string | null }): string {
  const c = a.category ? CATEGORIES.find((x) => x.id === a.category) : undefined;
  return c ? `${c.icon} ${c.zh}` : groupLabel(a.category_group);
}
