import Link from "next/link";

/** 首页 hero 标题上面的一排快捷入口（和页脚那排一样，手机上一行放下） */
export default function HeroActions({ hasShop = false }: { hasShop?: boolean }) {
  const links = hasShop
    ? [
        { href: "/merchant", label: "管理我的名片" },
        { href: "/recommend", label: "推荐一位师傅" },
        { href: "/ask", label: "邻居求推荐" },
      ]
    : [
        { href: "/merchant/register", label: "商家免费注册" },
        { href: "/recommend", label: "推荐一位师傅" },
        { href: "/ask", label: "邻居求推荐" },
        { href: "/merchant/claim", label: "认领我的店" },
      ];
  return (
    <nav aria-label="快捷入口" className="relative mb-3 flex gap-1.5 sm:gap-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex-1 whitespace-nowrap rounded-full bg-white/15 px-1 py-1 text-center text-[min(12px,3.1vw)] font-semibold text-white ring-1 ring-white/40 active:bg-white/25 sm:flex-none sm:px-3 sm:text-xs"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
