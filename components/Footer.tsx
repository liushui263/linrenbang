import Link from "next/link";
import { DISCLAIMER_EN, DISCLAIMER_ZH, SITE_NAME, SITE_NAME_EN } from "@/constants/site";

/** 13.4：所有页面底部固定中英双语免责声明 */
export default function Footer({ hasShop = false }: { hasShop?: boolean }) {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-2xl space-y-2 px-4 py-6 text-xs leading-relaxed text-gray-500">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-gray-900">
          {hasShop ? <Link href="/merchant">管理我的名片</Link> : <Link href="/merchant/register">商家免费注册</Link>}
          <Link href="/recommend">推荐一位师傅</Link>
          <Link href="/ask">邻居求推荐</Link>
          {!hasShop && <Link href="/merchant/claim">认领我的店</Link>}
        </div>
        <p>{DISCLAIMER_ZH}</p>
        <p>{DISCLAIMER_EN}</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            © {new Date().getFullYear()} {SITE_NAME} {SITE_NAME_EN}
          </span>
          <Link href="/privacy" className="underline">
            隐私政策 Privacy
          </Link>
          <Link href="/terms" className="underline">
            服务条款 Terms
          </Link>
        </p>
      </div>
    </footer>
  );
}
