import Link from "next/link";
import AreaSelect from "@/components/AreaSelect";
import HeroActions from "@/components/HeroActions";
import { AskRow } from "@/components/AskCard";
import ProviderCard from "@/components/ProviderCard";
import RankedList from "@/components/RankedList";
import SeasonalCard from "@/components/SeasonalCard";
import TodayPicks from "@/components/TodayPicks";
import UnsupportedCityNotice from "@/components/UnsupportedCityNotice";
import { nearbyLiveCities } from "@/constants/cities";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  CATEGORY_IDS,
  type CategoryGroup,
  categoryName,
  findGroup,
  groupOfCategory,
} from "@/constants/categories";
import { HOT_SEARCHES, SITE_NAME, SITE_NAME_EN, SITE_SLOGAN_EN } from "@/constants/site";
import { HOME_ASK_COUNT, titleFromSearch } from "@/lib/ask";
import { getLatestAsks, similarAsks } from "@/lib/asks";
import { getVisitorLocation } from "@/lib/location";
import { getCurrentUser } from "@/lib/auth";
import { getGroupRotation, getMyProvider, getNewPicks, getSeasonalPicks, getTodayRotation, listProviders, listRanked } from "@/lib/providers";
import { currentReminders } from "@/lib/seasonal";

export const dynamic = "force-dynamic";

interface SP {
  category?: string;
  group?: string;
  /** 搜索页多选的大类，逗号分隔 */
  groups?: string;
  q?: string;
  page?: string;
  /** 片区：URL 里的优先，没有就用 cookie 里记住的 */
  area?: string;
}

function href(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `/?${qs}` : "/";
}

/** 点大类去哪：只有 1 个细分类的直接进细分类，再点一次取消 */
function groupHref(g: CategoryGroup, activeGroup: CategoryGroup | undefined, q: string | undefined, area: string | undefined) {
  if (activeGroup?.id === g.id) return href({ q, area });
  return g.categories.length === 1 ? href({ category: g.categories[0], q, area }) : href({ group: g.id, q, area });
}

function GroupTile({ g, active, link }: { g: CategoryGroup; active: boolean; link: string }) {
  return (
    <Link
      href={link}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] px-0.5 py-2 text-center shadow-[0_3px_10px_rgba(30,70,120,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 active:translate-y-0 sm:gap-1 sm:py-2.5 ${
        active ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20" : "border-slate-200 bg-white"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] leading-none sm:h-11 sm:w-11 sm:text-[24px]"
        style={{ backgroundColor: g.tint }}
      >
        {g.icon}
      </span>
      <span className={`text-[12.5px] font-bold leading-snug sm:text-sm ${active ? "text-emerald-800" : "text-slate-800"}`}>{g.zh}</span>
      <span className="whitespace-nowrap text-[10px] leading-tight text-slate-400 max-[359px]:text-[9px] sm:text-[11px]">{g.hint}</span>
    </Link>
  );
}

/** 分类区：8 个大类分两行全部列出；选中大类后下面出细分类。链接都带上当前片区 */
function CategoryNav({ category, group, q, area }: { category?: string; group?: CategoryGroup; q?: string; area?: string }) {
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs sm:text-sm ${active ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`;
  return (
    <nav aria-label="分类" className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {CATEGORY_GROUPS.map((g) => (
          <GroupTile key={g.id} g={g} active={group?.id === g.id} link={groupHref(g, group, q, area)} />
        ))}
      </div>

      {group && group.categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2.5">
          <Link href={href({ group: group.id, q, area })} className={chip(!category)} aria-current={!category ? "page" : undefined}>
            全部{group.zh}
          </Link>
          {group.categories.map((id) => {
            const c = CATEGORIES.find((x) => x.id === id)!;
            const active = id === category;
            return (
              <Link
                key={id}
                href={active ? href({ group: group.id, q, area }) : href({ category: id, q, area })}
                className={chip(active)}
                aria-current={active ? "page" : undefined}
              >
                {c.icon} {c.zh}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [visitor, user] = await Promise.all([getVisitorLocation(), getCurrentUser().catch(() => null)]);
  const loc = sp.area && visitor.city.areas.includes(sp.area) ? { ...visitor, area: sp.area } : visitor;
  const myShop = await getMyProvider(user?.id).catch(() => null);
  let category = sp.category && CATEGORY_IDS.includes(sp.category) ? sp.category : undefined;
  const group = category ? groupOfCategory(category) : findGroup(sp.group);
  // 只有一个细分类的大类（如餐饮美食）等同于那个细分类
  if (!category && group?.categories.length === 1) category = group.categories[0];
  const groupParam = !category && group ? group.id : undefined;
  const q = sp.q?.trim() || undefined;
  // 当前片区（URL 或 cookie 里的），页面上所有站内链接都带上 ?area=，点分类/翻页/搜索不丢片区
  const area = loc.area ?? undefined;
  // 只有搜索结果分页；首页和分类页的列表是一次列全再折叠
  const page = q ? Math.max(1, Number(sp.page) || 1) : 1;

  // 搜索页可以多选大类（?groups=a,b）；从首页带过来的 group / 单分类大类也算进去。
  // 选的是多细分类大类里的某一个细分类（如空调暖气）时，单独作为一个已选项。
  const fineCategory = category && (groupOfCategory(category)?.categories.length ?? 0) > 1 ? category : undefined;
  const searchGroups: CategoryGroup[] = [];
  if (q) {
    const ids = [...(sp.groups?.split(",") ?? []), ...(group && !fineCategory ? [group.id] : [])];
    for (const id of ids) {
      const g = findGroup(id);
      if (g && !searchGroups.includes(g)) searchGroups.push(g);
    }
  }
  const searchCategory =
    q && fineCategory && !searchGroups.some((g) => g.categories.includes(fineCategory)) ? fineCategory : undefined;
  const searchCats = [...searchGroups.flatMap((g) => g.categories), ...(searchCategory ? [searchCategory] : [])];
  const searchHref = (groups: CategoryGroup[], cat?: string, pageNo?: number) =>
    href({ q, groups: groups.map((g) => g.id).join(",") || undefined, category: cat, area, page: pageNo ? String(pageNo) : undefined });
  const pageHref = (n: number) => searchHref(searchGroups, searchCategory, n);

  // 搜索时不显示轮换；轮换在所有页都从列表里排除，保证翻页不重复
  const rotation = q
    ? []
    : groupParam && group
      ? await getGroupRotation(loc.city.id, group.categories)
      : await getTodayRotation(loc.city.id, category);
  // 最近新加入 / 新被推荐的排在“今日”最前面（和轮换去重），同样从下面的列表里排除
  const newPicks = q
    ? []
    : await getNewPicks(loc.city.id, category ? [category] : groupParam ? group?.categories : undefined).catch(() => []);
  const newIds = new Set(newPicks.map((n) => n.provider.id));
  const todayCards = [
    ...newPicks.map((n) => ({ p: n.provider, newKind: n.kind })),
    ...rotation.filter((p) => !newIds.has(p.id)).map((p) => ({ p, newKind: undefined })),
  ];
  // 搜索：分页的名片列表；不搜索：下面“按推荐数排序”一行一家列出全部（包括今日推荐里的）
  const list = q
    ? await listProviders({ cityId: loc.city.id, categories: searchCats.length ? searchCats : undefined, area, q, page })
    : { providers: [], total: 0, page: 1, pageCount: 1 };
  const ranked = q
    ? []
    : await listRanked({ cityId: loc.city.id, category, categories: groupParam ? group?.categories : undefined, area });
  const showRotation = todayCards.length > 0 && page === 1;
  // 首页（不搜索、不选分类、第一页）显示“邻居在求推荐”；搜不到时找类似的提问
  const showAsks = !q && !category && !group && page === 1;
  const [homeAsks, similar] = await Promise.all([
    showAsks ? getLatestAsks(loc.city.id, HOME_ASK_COUNT).catch(() => null) : null,
    q && list.total === 0 ? similarAsks(loc.city.id, q).catch(() => []) : [],
  ]);
  const askPrefill = q
    ? `/ask/new?${new URLSearchParams({ q, ...(loc.area && { area: loc.area }), ...(searchGroups.length === 1 && { group: searchGroups[0].id }) })}`
    : "/ask/new";

  // 季节提醒：只在首页本身（没搜索、没选分类、第 1 页）显示当月第一条
  const [season, ...otherSeasons] = !q && !category && !group && page === 1 ? currentReminders() : [];
  const seasonPicks = season ? await getSeasonalPicks(loc.city.id, season.categories, 2).catch(() => []) : [];
  const scopeName = category ? categoryName(category) : group ? group.zh : undefined;
  const label = scopeName ?? (q ? `“${q}”` : "师傅");
  const where = `${loc.city.zh}${loc.area ? ` · ${loc.area}` : ""}`;

  const selectedNames = [...searchGroups.map((g) => g.zh), ...(searchCategory ? [categoryName(searchCategory)] : [])];
  const chipBase = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs sm:text-sm";
  // 搜索页的分类筛选：上面一行是已选（点 ✕ 去掉），下面一行是还能加的大类（可多选）
  const filterPanel = q && (
    <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 first:mt-0 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-500">已选分类：</span>
        {selectedNames.length === 0 && <span className="text-xs text-gray-700">全部</span>}
        {searchGroups.map((g) => (
          <Link
            key={g.id}
            href={searchHref(searchGroups.filter((x) => x !== g), searchCategory)}
            className={`${chipBase} bg-emerald-600 text-white`}
            aria-label={`去掉分类：${g.zh}`}
          >
            {g.icon} {g.zh} <span aria-hidden="true">✕</span>
          </Link>
        ))}
        {searchCategory && (
          <Link href={searchHref(searchGroups)} className={`${chipBase} bg-emerald-600 text-white`} aria-label={`去掉分类：${categoryName(searchCategory)}`}>
            {categoryName(searchCategory)} <span aria-hidden="true">✕</span>
          </Link>
        )}
        {selectedNames.length > 1 && (
          <Link href={searchHref([])} className="text-xs text-emerald-700 underline">
            全部清除
          </Link>
        )}
      </div>
      {searchGroups.length < CATEGORY_GROUPS.length && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500">{selectedNames.length ? "再加分类：" : "按分类筛选（可多选）："}</span>
          {CATEGORY_GROUPS.filter((g) => !searchGroups.includes(g)).map((g) => (
            <Link
              key={g.id}
              href={searchHref(
                [...searchGroups, g],
                searchCategory && g.categories.includes(searchCategory) ? undefined : searchCategory,
              )}
              className={`${chipBase} bg-gray-100 text-slate-700`}
            >
              + {g.zh}
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const pager = list.pageCount > 1 && (
    <div className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={pageHref(page - 1)} className="text-emerald-700">
          ← 上一页
        </Link>
      ) : (
        <span />
      )}
      <span className="text-gray-400">
        {page} / {list.pageCount}
      </span>
      {page < list.pageCount ? (
        <Link href={pageHref(page + 1)} className="text-emerald-700">
          下一页 →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );

  return (
    <div className="space-y-5 sm:pt-4">
      {loc.zip && !loc.zipCity && !loc.cityNoticeDismissed && (
        <UnsupportedCityNotice
          zip={loc.zip}
          viewingCity={loc.city.zh}
          nearby={nearbyLiveCities(loc.zip).map((c) => ({
            zh: c.zh,
            areas: c.areas.filter((a) => c.areaZips[a]).map((a) => ({ area: a, zip: c.areaZips[a] })),
          }))}
        />
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
        <HeroActions hasShop={!!myShop} />
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
          {area && <input type="hidden" name="area" value={area} />}
          {q ? (
            <>
              {searchGroups.length > 0 && <input type="hidden" name="groups" value={searchGroups.map((g) => g.id).join(",")} />}
              {searchCategory && <input type="hidden" name="category" value={searchCategory} />}
            </>
          ) : (
            <>
              {category && <input type="hidden" name="category" value={category} />}
              {groupParam && <input type="hidden" name="group" value={groupParam} />}
            </>
          )}
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
          {q ? null : scopeName ? (
            <Link
              href={href({ area })}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs text-white ring-1 ring-white/40"
              aria-label={`取消分类：${scopeName}`}
            >
              已选：{scopeName} <span aria-hidden="true">✕</span>
            </Link>
          ) : (
            <span className="text-xs text-emerald-100">
              热搜：
              {HOT_SEARCHES.map((t, i) => (
                <span key={t}>
                  {i > 0 && " · "}
                  <Link href={href({ q: t, area })} className="underline underline-offset-2">
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
                  <Link href={href({ area })} className="shrink-0 text-xs text-emerald-700 underline">
                    清除搜索
                  </Link>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {where} · {selectedNames.length ? `在 ${selectedNames.length} 个分类里` : "全部分类"} · 按邻居推荐数排序
                </p>
                {filterPanel}
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
            <section id="results" aria-live="polite" className="space-y-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="text-base font-bold">
                  还没有邻居推荐过「{q}」{selectedNames.length ? `（${selectedNames.join("、")}）` : ""}
                </p>
                <p className="mt-1">
                  发个求推荐，附近用过的邻居看到会回你。
                  {selectedNames.length > 0 && (
                    <>
                      也可以
                      <Link href={searchHref([])} className="underline">
                        在全部分类里搜
                      </Link>
                      。
                    </>
                  )}
                </p>
                <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-amber-200">
                  <p className="text-xs text-gray-500">帮你写好了，可以改：</p>
                  <p className="mt-1 text-[15px] font-semibold text-gray-900">{titleFromSearch(q)}</p>
                  <p className="mt-1 text-xs text-gray-500">📍 {loc.area ?? "发帖时选片区"}</p>
                </div>
                <Link href={askPrefill} className="mt-3 block rounded-xl bg-emerald-600 py-3 text-center text-base font-semibold text-white">
                  🙋 问问邻居
                </Link>
                {similar.length > 0 && (
                  <div className="mt-3 border-t border-amber-200 pt-2">
                    <p className="text-xs text-amber-800">已经有邻居问过类似的：</p>
                    <div className="mt-1 divide-y divide-amber-100 rounded-xl bg-white px-3 ring-1 ring-amber-200">
                      {similar.map((a) => (
                        <AskRow key={a.id} ask={a} />
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-3 text-center text-xs text-amber-800">
                  我知道一个，
                  <Link href="/recommend" className="underline">
                    直接推荐他
                  </Link>
                  {!myShop && (
                    <>
                      {" · "}我是商家，
                      <Link href="/merchant/register" className="underline">
                        免费注册
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">{filterPanel}</div>
            </section>
          )}
        </>
      ) : (
        <>
          {season && <SeasonalCard reminder={season} picks={seasonPicks} others={otherSeasons} />}

          {showRotation && (
            <section>
              <h2 className="mb-2 flex items-baseline justify-between font-bold text-gray-900">
                {scopeName ? `今日推荐 · ${scopeName}` : "今日邻人推荐"}
                <span className="text-xs font-normal text-gray-400">每天 0 点换一批</span>
              </h2>
              <TodayPicks>
                {todayCards.map(({ p, newKind }) =>
                  newKind ? (
                    <ProviderCard key={p.id} provider={p} newKind={newKind} />
                  ) : (
                    <ProviderCard key={p.id} provider={p} isTodayPick />
                  ),
                )}
              </TodayPicks>
            </section>
          )}

          {showAsks && homeAsks && (
            <section className="rounded-2xl bg-gradient-to-b from-amber-50 to-white px-4 pb-3 pt-3 ring-1 ring-amber-200">
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold text-gray-900">🙋 邻居在求推荐</h2>
                {homeAsks.total > 0 && (
                  <Link href="/ask" className="text-sm font-medium text-emerald-700">
                    查看全部 ›
                  </Link>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">用过靠谱的，顺手推荐一下；自己要找，也可以问</p>
              {homeAsks.asks.length > 0 ? (
                <div className="divide-y divide-amber-100">
                  {homeAsks.asks.map((a) => (
                    <AskRow key={a.id} ask={a} />
                  ))}
                </div>
              ) : (
                <p className="py-3 text-sm text-gray-600">找不到合适的师傅？发一条求推荐，附近用过的邻居会告诉你。</p>
              )}
              <div className="mt-1 flex gap-2">
                <Link href="/ask/new" className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-medium text-white">
                  ✋ 我也要问邻居
                </Link>
                {homeAsks.total > 0 && (
                  <Link
                    href="/ask"
                    className="flex-1 rounded-xl border border-emerald-600 bg-white py-2.5 text-center text-sm font-medium text-emerald-700"
                  >
                    查看全部 {homeAsks.total} 条
                  </Link>
                )}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 font-bold text-gray-900">热门服务</h2>
            <CategoryNav category={category} group={group} area={area} />
          </section>

          <section>
            <h2 className="mb-2 font-bold text-gray-900">
              {where} · {scopeName ?? "全部商家"}
              <span className="ml-2 text-sm font-normal text-gray-400">按邻居推荐数排序</span>
            </h2>
            {ranked.length === 0 ? (
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
              <RankedList
                key={`${area ?? ""}|${category ?? ""}|${groupParam ?? ""}`}
                rows={ranked.map((p) => ({
                  id: p.id,
                  name: p.name,
                  categories: p.categories?.length ? p.categories : [p.category],
                  recommend_count: p.recommend_count,
                  paused: p.status === "paused",
                }))}
              />
            )}
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
