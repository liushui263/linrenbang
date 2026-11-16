import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import CityBar from "@/components/CityBar";
import Footer from "@/components/Footer";
import { HOME_OG, SITE_NAME, SITE_NAME_EN, SITE_SLOGAN_EN, SITE_URL } from "@/constants/site";
import { getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";

// 13.2：全站默认分享卡片（微信群/朋友圈转发显示图文卡片）
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_OG.title, template: `%s - ${SITE_NAME}` },
  description: HOME_OG.description,
  applicationName: `${SITE_NAME} ${SITE_NAME_EN} · ${SITE_SLOGAN_EN}`,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: HOME_OG.title,
    description: HOME_OG.description,
    url: "/",
    locale: "zh_CN",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: HOME_OG.title }],
  },
  twitter: { card: "summary_large_image", title: HOME_OG.title, description: HOME_OG.description, images: ["/og-default.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [loc, user] = await Promise.all([getVisitorLocation(), getCurrentUser().catch(() => null)]);
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-2">
            <Link href="/" className="flex shrink-0 items-center gap-1.5" aria-label={`${SITE_NAME} ${SITE_SLOGAN_EN}`}>
              <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="#059669" />
                <path d="M7 16 L16 8 L25 16 V25 H7 Z" fill="#fff" />
                <path d="M13.5 25 V19.5 H18.5 V25" fill="#059669" />
                <path d="M16 13.2 c-1.1-1.5-3.4-.6-2.6 1.3 L16 17 l2.6-2.5 c.8-1.9-1.5-2.8-2.6-1.3z" fill="#f59e0b" />
              </svg>
              <span className="flex flex-col leading-none">
                <span className="text-lg font-bold text-emerald-700">{SITE_NAME}</span>
                <span className="hidden text-[10px] font-medium tracking-wide text-gray-500 sm:block">{SITE_SLOGAN_EN}</span>
              </span>
            </Link>
            <CityBar cityName={loc.city.zh} zip={loc.zip} needsZip={!loc.hasChosen} />
            {user ? (
              <Link href="/me" className="shrink-0 text-sm text-gray-600">
                我的
              </Link>
            ) : (
              <Link href="/login" className="shrink-0 text-sm text-gray-600">
                登录
              </Link>
            )}
          </div>
        </header>
        <main className="mx-auto min-h-[70vh] max-w-2xl px-4 pb-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
