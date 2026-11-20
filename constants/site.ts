export const SITE_NAME = "邻人帮";
export const SITE_NAME_EN = "Linren Bang";
export const SITE_SLOGAN_EN = "My Neighborhood Helpers";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://linrenbang.com";

export const FOUNDING_SLOTS = 100; // 前 100 名创始商家
export const FOUNDING_DAYS = 100; // 创始有效期 100 天，自审核通过日起算，到期自动失效
export const ROTATION_POOL_PER_CATEGORY = 10; // 每分类、创始有效期内、通过最早的 10 名进轮换池
export const MAX_ROTATION_PER_LIST = 2; // 每页列表顶部最多 2 条轮换
export const PAGE_SIZE = 20;

export const ROTATION_EPOCH = "2026-01-01"; // dayIndex 起算日
export const ROTATION_TIME_ZONE = "America/Chicago";

export const CONTACT_REVEALS_PER_HOUR = 30; // 同一 IP 每小时最多取联系方式次数

export const HOME_OG = {
  title: "邻人帮 · 本地靠谱华人服务推荐",
  description: "空调、水电、屋顶、庭院、搬家、房产经纪、贷款过户、餐馆——先看邻居真实推荐，再打电话。",
};

export const DISCLAIMER_ZH =
  "免责声明：邻人帮仅为本地华人生活信息展示与邻里经验分享平台，不核验商家的州专业执照、商业保险或背景资质，不构成任何官方背书或担保。服务交易与售后纠纷由用户与商家自行协商承担。";
export const DISCLAIMER_EN =
  "Disclaimer: Linren Bang is an informational community directory only. We do not verify state licenses, insurance, or background credentials, nor do we endorse or guarantee any service provider. Users engage providers at their own discretion and risk.";

/** 顾客联系商家的方式（v3.4）：商家可多选，并指定一个“最希望”的方式 */
export const CONTACT_METHODS = [
  { id: "phone", zh: "打电话", pref: "偏好电话联系" },
  { id: "sms", zh: "发短信", pref: "偏好短信联系" },
  { id: "wechat", zh: "加微信", pref: "偏好微信联系" },
] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number]["id"];
export const CONTACT_METHOD_IDS: readonly string[] = CONTACT_METHODS.map((m) => m.id);
/** 发短信时预填的开头，商家一看就知道是从邻人帮来的 */
export const SMS_GREETING = "你好，我在邻人帮看到你的名片，想咨询一下：";

/** 首页搜索框下面的热搜词（点了直接搜） */
export const HOT_SEARCHES = ["换热水器", "空调", "搬家", "报税"];
