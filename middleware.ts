import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * 不给网站带来访客、只会大量抓页面的爬虫（AI 训练、SEO 工具）。直接 403，不渲染页面，省 Vercel CPU。
 * 搜索引擎（Google/Bing/百度）和微信、Facebook 的分享卡片预览不在这里，照常放行。
 */
const BLOCKED_BOTS =
  /GPTBot|ChatGPT-User|OAI-SearchBot|CCBot|ClaudeBot|Claude-Web|anthropic-ai|Bytespider|Amazonbot|meta-externalagent|meta-externalfetcher|PerplexityBot|Diffbot|ImagesiftBot|cohere-ai|Omgili|Timpibot|AhrefsBot|SemrushBot|MJ12bot|DotBot|DataForSeoBot|BLEXBot|PetalBot|serpstatbot|Barkrowler|SeekportBot|Scrapy|python-requests|Go-http-client/i;

/** Supabase 登录 cookie 名字是 sb-<项目>-auth-token（可能分成 .0 .1 几段） */
function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export async function middleware(request: NextRequest) {
  if (BLOCKED_BOTS.test(request.headers.get("user-agent") ?? "")) {
    return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "public, max-age=86400" } });
  }
  // 没登录的访客（绝大多数人和所有爬虫）没有登录态要刷新，直接放行，不建 Supabase 客户端
  if (!hasAuthCookie(request)) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  // 静态文件、图片、分享卡片图、robots/sitemap、只记数的接口都不走 middleware
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|og-default.png|api/health|api/providers/.*/contact|api/providers/.*/event|season/.*/opengraph-image|season/.*/poster.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
