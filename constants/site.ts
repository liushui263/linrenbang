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
