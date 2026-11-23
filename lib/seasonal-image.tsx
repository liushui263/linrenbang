import "server-only";
import { ImageResponse } from "next/og";
import { providerCategoryLabel } from "@/constants/categories";
import type { SeasonalReminder } from "@/constants/seasonal";
import { SITE_NAME, SITE_URL } from "@/constants/site";
import type { PublicProvider } from "@/lib/types";

/**
 * 季节提醒的两种图片：
 * - og：1200×630，微信/朋友圈分享卡片用
 * - poster：750 宽、高度随内容 竖版，分享页上“长按保存图片发群”用
 * 只放商家名、分类、推荐数，不放电话和微信（防爬）。
 */

type Weight = 400 | 700;

/** 按图里实际用到的字，从 Google Fonts 取一个小字体子集（几 KB），取不到就用默认字体 */
async function loadFont(text: string, weight: Weight): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url, { next: { revalidate: 86400 } })).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src, { next: { revalidate: 86400 } });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

type Fonts = Awaited<ReturnType<typeof fontsFor>>;

async function fontsFor(text: string) {
  const unique = [...new Set(text + "0123456789")].join("");
  const [regular, bold] = await Promise.all([loadFont(unique, 400), loadFont(unique, 700)]);
  return [
    ...(regular ? [{ name: "NotoSC", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(bold ? [{ name: "NotoSC", data: bold, weight: 700 as const, style: "normal" as const }] : []),
  ];
}

const host = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

function providerLine(p: PublicProvider) {
  return { name: p.name, label: providerCategoryLabel(p), count: `${p.recommend_count}位邻居推荐` };
}

// 分享卡片图和海报都不读 cookie（海报的城市在 URL 里），都走 CDN 缓存：画一次图给所有人用
const CACHE_SHARED = { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" };

function ogImage(r: SeasonalReminder, picks: PublicProvider[], fonts: Fonts, withEmoji: boolean) {
  const names = picks.slice(0, 2).map((p) => p.name);
  const pickText = names.length ? `邻居推荐：${names.join("、")}` : "先看邻居推荐，再打电话";
  const footer = `${SITE_NAME} · ${host}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: `linear-gradient(135deg, ${r.color} 0%, #064e3b 100%)`,
          color: "white",
          fontFamily: "NotoSC",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, opacity: 0.9 }}>
          <span>季节提醒</span>
          <span>{footer}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {withEmoji && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 200,
              height: 200,
              borderRadius: 100,
              background: "rgba(255,255,255,0.18)",
              fontSize: 120,
            }}
          >
            {r.icon}
          </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.15 }}>{r.title}</div>
            <div style={{ marginTop: 18, fontSize: 32, lineHeight: 1.4, opacity: 0.92 }}>{r.subtitle}</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#fde68a" }}>{pickText}</div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}

/** 竖版海报的高度按内容算：长提示一般占两行 */
function posterHeight(tips: string[], pickCount: number) {
  const tipRows = tips.reduce((n, t) => n + (t.length > 22 ? 2 : 1), 0);
  return 300 + 80 + tipRows * 40 + tips.length * 14 + 80 + Math.max(1, pickCount) * 118 + 32 + 110;
}

function posterImage(r: SeasonalReminder, picks: PublicProvider[], cityZh: string, fonts: Fonts, withEmoji: boolean) {
  const lines = picks.slice(0, 3).map(providerLine);
  const tips = r.tips.slice(0, 5);
  const url = `${host}/season/${r.id}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "NotoSC" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "48px 48px 40px",
            flexShrink: 0,
            background: `linear-gradient(135deg, ${r.color} 0%, #064e3b 100%)`,
            color: "white",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.9 }}>
            <span>
              {SITE_NAME} · {cityZh}季节提醒
            </span>
            {withEmoji && <span style={{ fontSize: 64, lineHeight: 1 }}>{r.icon}</span>}
          </div>
          <div style={{ marginTop: 12, fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>{r.title}</div>
          <div style={{ marginTop: 14, fontSize: 28, lineHeight: 1.45, opacity: 0.92 }}>{r.subtitle}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "32px 48px 0", flexShrink: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>该做什么</div>
          {tips.map((t, i) => (
            <div key={i} style={{ display: "flex", marginTop: 14, fontSize: 26, lineHeight: 1.4, color: "#334155" }}>
              <span style={{ width: 40, color: r.color, fontWeight: 700 }}>{i + 1}.</span>
              <span style={{ flex: 1 }}>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "32px 48px 32px", flexGrow: 1, flexShrink: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>邻居推荐的师傅</div>
          {lines.length === 0 && <div style={{ marginTop: 14, fontSize: 26, color: "#64748b" }}>还没有邻居推荐，你来推荐第一个</div>}
          {lines.map((l, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 14,
                padding: "18px 24px",
                borderRadius: 20,
                background: "white",
                border: "2px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>{l.name}</span>
                <span style={{ marginTop: 4, fontSize: 22, color: "#64748b" }}>{l.label}</span>
              </div>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#ea580c" }}>{l.count}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "28px 48px 36px",
            flexShrink: 0,
            background: "#064e3b",
            color: "white",
          }}
        >
          <span style={{ fontSize: 30, fontWeight: 700 }}>{url}</span>
          <span style={{ marginTop: 6, fontSize: 22, opacity: 0.85 }}>打开网址看电话 · 先看邻居推荐，再打电话</span>
        </div>
      </div>
    ),
    { width: 750, height: posterHeight(tips, lines.length), fonts },
  );
}

/**
 * 先完整画出来再返回：表情图标要从 CDN 取，取不到时整张图会坏掉，
 * 这时去掉表情再画一次，保证分享卡片总有图。
 */
async function renderSafely(draw: (withEmoji: boolean) => ImageResponse, headers: Record<string, string>) {
  let buf: ArrayBuffer;
  try {
    buf = await draw(true).arrayBuffer();
  } catch {
    buf = await draw(false).arrayBuffer();
  }
  return new Response(buf, { headers: { "Content-Type": "image/png", ...headers } });
}

export async function seasonalOgImage(r: SeasonalReminder, picks: PublicProvider[]) {
  const names = picks.slice(0, 2).map((p) => p.name).join("、");
  const fonts = await fontsFor(`${r.title}${r.subtitle}邻居推荐：${names}先看邻居推荐，再打电话${SITE_NAME} · ${host}季节提醒`);
  return renderSafely((e) => ogImage(r, picks, fonts, e), CACHE_SHARED);
}

export async function seasonalPosterImage(r: SeasonalReminder, picks: PublicProvider[], cityZh: string) {
  const text = [
    r.title,
    r.subtitle,
    ...r.tips,
    ...picks.slice(0, 3).flatMap((p) => [p.name, providerCategoryLabel(p), `${p.recommend_count}位邻居推荐`]),
    `${host}/season/${r.id}`,
    cityZh,
    SITE_NAME,
    "季节提醒 该做什么 邻居推荐的师傅 还没有邻居推荐，你来推荐第一个 打开网址看电话 · 先看邻居推荐，再打电话",
  ].join("");
  const fonts = await fontsFor(text);
  return renderSafely((e) => posterImage(r, picks, cityZh, fonts, e), CACHE_SHARED);
}
