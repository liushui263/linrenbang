import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";

/** AI 训练、SEO 工具爬虫：不带来访客，只消耗 Vercel 免费额度（middleware 里也会直接 403） */
const BLOCKED_BOTS = [
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "PerplexityBot",
  "Diffbot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "BLEXBot",
  "PetalBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/merchant",
          "/me",
          "/login",
          "/auth/",
          "/recommend",
          "/ask/new",
          // 首页的搜索词、片区、翻页组合几乎无限多，爬虫一个个抓会把 CPU 额度用光；分类页（?category= / ?group=）照常收录
          "/*?*q=",
          "/*?*area=",
          "/*?*page=",
          "/*?*groups=",
          "/season/*/poster.png",
        ],
      },
      { userAgent: BLOCKED_BOTS, disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
