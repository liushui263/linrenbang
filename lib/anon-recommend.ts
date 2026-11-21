/** 冷启动期的匿名快速推荐：只填 名字 / 电话 / 服务内容（纯函数，前后端和测试共用） */
import { CATEGORIES, OTHER_CATEGORY } from "@/constants/categories";
import { toE164 } from "@/lib/phone";
import { validateForm, type FieldErrors } from "@/lib/validate";

/** 同一 IP 24 小时内最多匿名推荐几条 */
export const ANON_RECS_PER_DAY = 5;
/** 浏览器里记住“我匿名推荐过哪些”的 cookie（存认领码，登录后凭它认领） */
export const ANON_CLAIM_COOKIE = "lrb_anon_recs";
/** cookie 里最多存几个认领码 */
export const ANON_CLAIM_MAX = 20;
/** 防机器人：表单里藏一个真人看不到的输入框，填了就是机器人 */
export const HONEYPOT_FIELD = "website";

export interface AnonRecommendInput {
  name: string;
  phone: string;
  service: string;
}

const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

export function parseAnonForm(fd: FormData, needProvider = true): { data?: AnonRecommendInput; error?: string; fieldErrors?: FieldErrors } {
  const fieldErrors = validateForm(fd, [...(needProvider ? ["name", "phone"] : []), "service"]);
  if (Object.keys(fieldErrors).length) return { error: "有几项需要改一下，见红字", fieldErrors };
  const phone = needProvider ? toE164(String(fd.get("phone") ?? "")) : "";
  if (needProvider && !phone) return { fieldErrors: { phone: "请填 10 位美国电话，例如 (713) 555-0123" } };
  return { data: { name: str(fd, "name", 60), phone: phone ?? "", service: str(fd, "service", 300) } };
}

/** 服务内容里的关键词 → 分类。猜不出来就归“其他服务”，站长审核时可以改 */
const KEYWORDS: Record<string, string[]> = {
  hvac: ["空调", "暖气", "冷气", "冷暖", "hvac", "ac", "heater", "furnace", "压缩机", "通风"],
  plumbing: ["水管", "水暖", "管道", "下水", "疏通", "漏水", "热水器", "马桶", "plumb", "水龙头"],
  electrical: ["电路", "电线", "电工", "照明", "灯", "插座", "electric", "电箱", "发电机"],
  roof: ["屋顶", "房顶", "roof", "瓦", "天沟", "gutter"],
  pest: ["除虫", "白蚁", "蟑螂", "老鼠", "虫", "pest"],
  lawn_fence: ["草坪", "割草", "庭院", "园艺", "围栏", "篱笆", "fence", "lawn", "树", "sprinkler"],
  appliance: ["家电", "车库门", "冰箱", "洗衣机", "烘干", "洗碗机", "garage"],
  handyman: ["装修", "杂修", "翻新", "油漆", "地板", "瓷砖", "橱柜", "handyman", "装修", "木工", "墙"],
  moving_ride: ["搬家", "搬运", "接送", "机场", "接机", "moving", "货运"],
  realtor: ["经纪", "房产", "地产", "买房", "卖房", "realtor", "租房"],
  mortgage_title: ["贷款", "过户", "mortgage", "loan", "title", "产权"],
  food: ["餐", "饭", "菜", "外卖", "美食", "包子", "饺子", "蛋糕", "烘焙", "私房"],
  tax: ["报税", "税", "会计", "cpa", "tax"],
  finance_insurance: ["保险", "理财", "财务", "insurance", "退休"],
};

export function guessCategory(text: string): string {
  const t = text.toLowerCase();
  let best = OTHER_CATEGORY;
  let bestAt = Infinity;
  // 取最先出现的关键词：“修空调顺便换了灯” → 空调
  for (const c of CATEGORIES) {
    for (const k of KEYWORDS[c.id] ?? []) {
      // 英文短词（ac）要整词匹配，免得 “contractor” 也算空调
      const at = /^[a-z]{1,3}$/.test(k) ? t.search(new RegExp(`(^|[^a-z])${k}([^a-z]|$)`)) : t.indexOf(k);
      if (at >= 0 && at < bestAt) {
        best = c.id;
        bestAt = at;
      }
    }
  }
  return best;
}

/** 猜成“其他服务”时，名片上要一个 2-12 字的服务名：取服务内容第一句 */
export function customServiceFrom(text: string): string {
  const first = text.split(/[，,。.!！?？；;\s]/).find((s) => s.trim().length >= 2) ?? text;
  return first.trim().slice(0, 12) || "其他服务";
}

/** cookie 里的认领码列表（逗号分隔、只保留合法的） */
export function readClaimTokens(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f]{32}$/.test(s))
    .slice(-ANON_CLAIM_MAX);
}

export function addClaimToken(raw: string | undefined | null, token: string): string {
  return [...readClaimTokens(raw).filter((t) => t !== token), token].slice(-ANON_CLAIM_MAX).join(",");
}

/** 名片上的“匿名推荐”小标志：有推荐但还没有登录邻居的推荐；邻居匿名代录入的新商家也算 */
export function showAnonMark(p: { recommend_count: number; member_recommend_count?: number | null; source?: string }): boolean {
  if (p.member_recommend_count == null) return false; // 迁移还没运行：不显示
  if (p.member_recommend_count > 0) return false;
  return p.recommend_count > 0 || p.source === "neighbor_anonymous";
}
