import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import CityBar from "@/components/CityBar";
import Footer from "@/components/Footer";
import { HOME_OG, SITE_NAME, SITE_NAME_EN, SITE_URL } from "@/constants/site";
import { getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";

// 13.2：全站默认分享卡片（微信群/朋友圈转发显示图文卡片）
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_OG.title, template: `%s - ${SITE_NAME}` },
  description: HOME_OG.description,
  applicationName: `${SITE_NAME} ${SITE_NAME_EN}`,
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
            <Link href="/" className="shrink-0 text-lg font-bold text-emerald-700">
              {SITE_NAME}
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
