import Link from "next/link";
import AreaSelect from "@/components/AreaSelect";
import ProviderCard from "@/components/ProviderCard";
import WaitlistForm from "@/components/WaitlistForm";
import { CATEGORIES, CATEGORY_IDS, categoryName } from "@/constants/categories";
import { SITE_NAME, SITE_NAME_EN, SITE_SLOGAN_EN } from "@/constants/site";
import { getVisitorLocation } from "@/lib/location";
import { getTodayRotation, listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

interface SP {
  category?: string;
  q?: string;
  page?: string;
}

function href(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const loc = await getVisitorLocation();
  const category = sp.category && CATEGORY_IDS.includes(sp.category) ? sp.category : undefined;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  // 搜索时不显示轮换；轮换在所有页都从列表里排除，保证翻页不重复
  const rotation = q ? [] : await getTodayRotation(loc.city.id, category);
  const list = await listProviders(
    { cityId: loc.city.id, category, area: loc.area ?? undefined, q, page },
    rotation.map((p) => p.id),
  );
  const showRotation = rotation.length > 0 && page === 1;
  const label = category ? categoryName(category) : q ? `“${q}”` : "师傅";

  return (
    <div className="space-y-5 sm:pt-4">
      {loc.zip && !loc.zipCity && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            你所在的城市（Zip {loc.zip}）还没开通，留个邮箱，有消息通知你。
            <br />
            <strong>当前查看：{loc.city.zh}</strong>
          </p>
          <WaitlistForm zip={loc.zip} />
        </div>
      )}

      <section className="hero-bg relative -mx-4 overflow-hidden px-5 pb-5 pt-4 text-white shadow-sm sm:mx-0 sm:rounded-3xl sm:px-7 sm:pt-6">
        {/* 底部的一排屋顶剪影 */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-white/10"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0 40 V28 L20 14 L40 28 V22 L62 6 L84 22 V30 L100 18 L116 30 V24 L140 8 L164 24 V32 L180 20 L196 32 V26 L220 10 L244 26 V30 L262 16 L280 30 V22 L304 6 L328 22 V30 L346 18 L364 30 V24 L382 12 L400 24 V40 Z"
          />
        </svg>
        <div className="relative">
          <h1 className="sr-only">
            {SITE_NAME} {SITE_NAME_EN} · {SITE_SLOGAN_EN}
          </h1>
          <p className="text-base font-bold text-white drop-shadow-sm sm:text-xl">找靠谱的华人服务，先看邻居推荐，再打电话</p>
          <p className="mt-1 whitespace-nowrap text-[min(11px,3.25vw)] tracking-tight text-emerald-100 sm:text-xs sm:tracking-normal">
            📍 {loc.city.zh}
            <span className="hidden sm:inline"> {loc.city.en}</span> · 邻居真实推荐，不刷星，不排名，靠真诚，靠声誉
          </p>
        </div>
        <form action="/" className="relative mt-4 flex gap-2">
          {category && <input type="hidden" name="category" value={category} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="搜师傅、店名、技能，如：换热水器"
            className="min-w-0 flex-1 rounded-xl border-0 bg-white px-4 py-2.5 text-gray-900 shadow-sm outline-none ring-2 ring-transparent focus:ring-amber-300"
          />
          <button className="rounded-xl bg-amber-400 px-4 py-2.5 font-semibold text-emerald-950 shadow-sm active:bg-amber-500">搜索</button>
        </form>
        <div className="relative mt-2 flex items-center gap-2 text-gray-900">
          <AreaSelect areas={loc.city.areas} value={loc.area} />
          {(category || q) && (
            <Link href="/" className="text-sm text-emerald-50 underline">
              清除筛选
            </Link>
          )}
        </div>
      </section>

      <nav className="grid grid-cols-3 gap-2" aria-label="分类">
        {CATEGORIES.map((c) => {
          const active = c.id === category;
          return (
            <Link
              key={c.id}
              href={active ? href({ q }) : href({ category: c.id, q })}
              className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-3 text-center text-xs ${
                active ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              {c.zh}
            </Link>
          );
        })}
      </nav>

      {showRotation && (
        <section>
          <h2 className="mb-2 font-bold text-gray-900">{category ? `今日推荐 · ${categoryName(category)}` : "今日邻人推荐"}</h2>
          <div className="space-y-3">
            {rotation.map((p) => (
              <ProviderCard key={p.id} provider={p} isTodayPick />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold text-gray-900">
          {loc.city.zh}
          {loc.area ? ` · ${loc.area}` : ""} · {category ? categoryName(category) : "全部"}
          <span className="ml-2 text-sm font-normal text-gray-400">按邻居推荐数排序</span>
        </h2>
        {list.providers.length === 0 && !showRotation ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600">
            <p>
              这里还没有人推荐{label}，
              <Link href="/recommend" className="text-emerald-700 underline">
                你来推荐第一个
              </Link>
              ，或者
              <Link href="/merchant/register" className="text-emerald-700 underline">
                商家免费注册
              </Link>
              。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.providers.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}

        {list.pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={href({ category, q, page: String(page - 1) })} className="text-emerald-700">
                ← 上一页
              </Link>
            ) : (
              <span />
            )}
            <span className="text-gray-400">
              {page} / {list.pageCount}
            </span>
            {page < list.pageCount ? (
              <Link href={href({ category, q, page: String(page + 1) })} className="text-emerald-700">
                下一页 →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-emerald-600 p-4 text-white">
        <p className="font-semibold">你是师傅/商家？</p>
        <p className="mt-1 text-sm text-emerald-50">免费注册，前 100 名是创始商家（有效期 100 天），每分类前 10 名每天轮换上首页。</p>
        <Link href="/merchant/register" className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-700">
          免费注册
        </Link>
      </section>
    </div>
  );
}
