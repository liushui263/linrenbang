import Link from "next/link";
import AreaSelect from "@/components/AreaSelect";
import ProviderCard from "@/components/ProviderCard";
import WaitlistForm from "@/components/WaitlistForm";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  CATEGORY_IDS,
  HOME_GROUP_COUNT,
  type CategoryGroup,
  categoryName,
  findGroup,
  groupOfCategory,
} from "@/constants/categories";
import { HOT_SEARCHES, SITE_NAME, SITE_NAME_EN, SITE_SLOGAN_EN } from "@/constants/site";
import { getVisitorLocation } from "@/lib/location";
import { getCurrentUser } from "@/lib/auth";
import { getGroupRotation, getMyProvider, getTodayRotation, listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

interface SP {
  category?: string;
  group?: string;
  q?: string;
  page?: string;
}

function href(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `/?${qs}` : "/";
}

/** 点大类去哪：只有 1 个细分类的直接进细分类，再点一次取消 */
function groupHref(g: CategoryGroup, activeGroup: CategoryGroup | undefined, q: string | undefined) {
  if (activeGroup?.id === g.id) return href({ q });
  return g.categories.length === 1 ? href({ category: g.categories[0], q }) : href({ group: g.id, q });
}

function GroupTile({ g, active, link }: { g: CategoryGroup; active: boolean; link: string }) {
  return (
    <Link
      href={link}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] px-1 py-2.5 text-center shadow-[0_3px_10px_rgba(30,70,120,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 active:translate-y-0 sm:py-3 ${
        active ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20" : "border-slate-200 bg-white"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full text-[24px] leading-none sm:h-12 sm:w-12 sm:text-[26px]"
        style={{ backgroundColor: g.tint }}
      >
        {g.icon}
      </span>
      <span className={`text-[13px] font-bold leading-snug sm:text-sm ${active ? "text-emerald-800" : "text-slate-800"}`}>{g.zh}</span>
      <span className="text-[10px] leading-tight text-slate-400 [overflow-wrap:anywhere] sm:text-[11px]">{g.hint}</span>
    </Link>
  );
}

/** 分类区：6 个大类 + “查看全部服务分类”（另外 2 个大类）；选中大类后下面出细分类 */
function CategoryNav({ category, group, q }: { category?: string; group?: CategoryGroup; q?: string }) {
  const shown = CATEGORY_GROUPS.slice(0, HOME_GROUP_COUNT);
  const more = CATEGORY_GROUPS.slice(HOME_GROUP_COUNT);
  const activeInMore = !!group && more.some((g) => g.id === group.id);
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs sm:text-sm ${active ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`;
  return (
    <nav aria-label="分类" className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {shown.map((g) => (
          <GroupTile key={g.id} g={g} active={group?.id === g.id} link={groupHref(g, group, q)} />
        ))}
      </div>

      {group && group.categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2.5">
          <Link href={href({ group: group.id, q })} className={chip(!category)} aria-current={!category ? "page" : undefined}>
            全部{group.zh}
          </Link>
          {group.categories.map((id) => {
            const c = CATEGORIES.find((x) => x.id === id)!;
            const active = id === category;
            return (
              <Link
                key={id}
                href={active ? href({ group: group.id, q }) : href({ category: id, q })}
                className={chip(active)}
                aria-current={active ? "page" : undefined}
              >
                {c.icon} {c.zh}
              </Link>
            );
          })}
        </div>
      )}

      <details open={activeInMore} className="group rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none py-2.5 text-center text-sm font-medium text-emerald-700 [&::-webkit-details-marker]:hidden">
          查看全部服务分类
          <span className="ml-1 inline-block transition group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-2.5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {more.map((g) => (
              <GroupTile key={g.id} g={g} active={group?.id === g.id} link={groupHref(g, group, q)} />
            ))}
          </div>
        </div>
      </details>
    </nav>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [loc, user] = await Promise.all([getVisitorLocation(), getCurrentUser().catch(() => null)]);
  const myShop = await getMyProvider(user?.id).catch(() => null);
  let category = sp.category && CATEGORY_IDS.includes(sp.category) ? sp.category : undefined;
  const group = category ? groupOfCategory(category) : findGroup(sp.group);
  // 只有一个细分类的大类（如餐饮美食）等同于那个细分类
  if (!category && group?.categories.length === 1) category = group.categories[0];
  const groupParam = !category && group ? group.id : undefined;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  // 搜索时不显示轮换；轮换在所有页都从列表里排除，保证翻页不重复
  const rotation = q
    ? []
    : groupParam && group
      ? await getGroupRotation(loc.city.id, group.categories)
      : await getTodayRotation(loc.city.id, category);
  const list = await listProviders(
    { cityId: loc.city.id, category, categories: groupParam ? group?.categories : undefined, area: loc.area ?? undefined, q, page },
    rotation.map((p) => p.id),
  );
  const showRotation = rotation.length > 0 && page === 1;
  const scopeName = category ? categoryName(category) : group ? group.zh : undefined;
  const label = scopeName ?? (q ? `“${q}”` : "师傅");
  const where = `${loc.city.zh}${loc.area ? ` · ${loc.area}` : ""}`;

  const pager = list.pageCount > 1 && (
    <div className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={href({ category, group: groupParam, q, page: String(page - 1) })} className="text-emerald-700">
          ← 上一页
        </Link>
      ) : (
        <span />
      )}
      <span className="text-gray-400">
        {page} / {list.pageCount}
      </span>
      {page < list.pageCount ? (
        <Link href={href({ category, group: groupParam, q, page: String(page + 1) })} className="text-emerald-700">
          下一页 →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );

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
          {groupParam && <input type="hidden" name="group" value={groupParam} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="搜师傅、店名、技能，如：换热水器"
            className="min-w-0 flex-1 rounded-xl border-0 bg-white px-4 py-2.5 text-gray-900 shadow-sm outline-none ring-2 ring-transparent focus:ring-amber-300"
          />
          <button className="rounded-xl bg-amber-400 px-4 py-2.5 font-semibold text-emerald-950 shadow-sm active:bg-amber-500">搜索</button>
        </form>
        <div className="relative mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-900">
          <AreaSelect areas={loc.city.areas} value={loc.area} />
          {category || group || q ? (
            <Link href="/" className="text-sm text-emerald-50 underline">
              清除筛选
            </Link>
          ) : (
            <span className="text-xs text-emerald-100">
              热搜：
              {HOT_SEARCHES.map((t, i) => (
                <span key={t}>
                  {i > 0 && " · "}
                  <Link href={href({ q: t })} className="underline underline-offset-2">
                    {t}
                  </Link>
                </span>
              ))}
            </span>
          )}
        </div>
      </section>

      {q ? (
        <>
          {/* 搜索结果：紧跟在搜索框下面，先给明确的状态，分类收起来 */}
          {list.total > 0 ? (
            <section id="results" className="space-y-3" aria-live="polite">
              <div className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-gray-900">
                    找到 <span className="text-emerald-700">{list.total}</span> 家 · “{q}”
                  </p>
                  <Link href={href({ category, group: groupParam })} className="shrink-0 text-xs text-emerald-700 underline">
                    清除搜索
                  </Link>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {where}
                  {scopeName ? ` · 只看${scopeName}` : ""} · 按邻居推荐数排序
                  {scopeName && (
                    <>
                      {" · "}
                      <Link href={href({ q })} className="text-emerald-700 underline">
                        在全部分类里搜
                      </Link>
                    </>
                  )}
                </p>
              </div>
              {list.providers.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
              {pager}
              <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-600">
                没找到合适的？
                <Link href="/recommend" className="text-emerald-700 underline">
                  推荐一个你用过的师傅
                </Link>
                {!myShop && (
                  <>
                    {" · "}
                    <Link href="/merchant/register" className="text-emerald-700 underline">
                      商家免费注册
                    </Link>
                  </>
                )}
              </p>
            </section>
          ) : (
            <section id="results" aria-live="polite" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="text-base font-bold">
                没找到和“{q}”相关的{scopeName ? `${scopeName}` : ""}师傅
              </p>
              <p className="mt-1">
                {where}暂时没有。可以换个说法试试
                {scopeName && (
                  <>
                    ，或者
                    <Link href={href({ q })} className="underline">
                      在全部分类里搜
                    </Link>
                  </>
                )}
                ，也可以从下面的分类里找。
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/recommend" className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-center font-medium text-white">
                  我知道一个，推荐他
                </Link>
                {!myShop && (
                  <Link
                    href="/merchant/register"
                    className="flex-1 rounded-xl border border-emerald-600 bg-white py-2.5 text-center font-medium text-emerald-700"
                  >
                    我是商家，免费注册
                  </Link>
                )}
              </div>
            </section>
          )}

          <details open={list.total === 0} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 [&::-webkit-details-marker]:hidden">
              按分类浏览
              <span className="transition group-open:rotate-90">▸</span>
            </summary>
            <div className="mt-2">
              <CategoryNav category={category} group={group} q={q} />
            </div>
          </details>
        </>
      ) : (
        <>
          {showRotation && (
            <section>
              <h2 className="mb-2 flex items-baseline justify-between font-bold text-gray-900">
                {scopeName ? `今日推荐 · ${scopeName}` : "今日邻人推荐"}
                <span className="text-xs font-normal text-gray-400">每天 0 点换一批</span>
              </h2>
              <div className="space-y-3">
                {rotation.map((p) => (
                  <ProviderCard key={p.id} provider={p} isTodayPick />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 font-bold text-gray-900">热门服务</h2>
            <CategoryNav category={category} group={group} />
          </section>

          <section>
            <h2 className="mb-2 font-bold text-gray-900">
              {where} · {scopeName ?? "全部"}
              <span className="ml-2 text-sm font-normal text-gray-400">按邻居推荐数排序</span>
            </h2>
            {list.providers.length === 0 && !showRotation ? (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600">
                <p>
                  这里还没有人推荐{label}，
                  <Link href="/recommend" className="text-emerald-700 underline">
                    你来推荐第一个
                  </Link>
                  {!myShop && (
                    <>
                      ，或者
                      <Link href="/merchant/register" className="text-emerald-700 underline">
                        商家免费注册
                      </Link>
                    </>
                  )}
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
            {pager}
          </section>
        </>
      )}

      {myShop ? (
        <section className="rounded-2xl bg-emerald-600 p-4 text-white">
          <p className="font-semibold">我的店：{myShop.name}</p>
          <p className="mt-1 text-sm text-emerald-50">改名片、换照片、看邻居给你的推荐，都在这里。</p>
          <Link href="/merchant" className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-700">
            管理我的名片
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl bg-emerald-600 p-4 text-white">
          <p className="font-semibold">你是师傅/商家？</p>
          <p className="mt-1 text-sm text-emerald-50">免费注册，前 100 名是创始商家（有效期 100 天），每分类前 10 名每天轮换上首页。</p>
          <Link href="/merchant/register" className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-700">
            免费注册
          </Link>
        </section>
      )}
    </div>
  );
}
