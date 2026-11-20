import Link from "next/link";
import { providerCategoryLabel, providerCategoryLabels } from "@/constants/categories";
import { formatServiceAreas } from "@/constants/cities";
import { foundingDaysLeft, isFoundingActive } from "@/lib/rotation";
import type { PublicProvider } from "@/lib/types";
import ContactButtons from "./ContactButtons";
import FavoriteButton from "./FavoriteButton";
import PhotoViewer from "./PhotoViewer";
import ShareButton from "./ShareButton";

interface Props {
  provider: PublicProvider;
  isTodayPick?: boolean;
  /** 最近几天新加入 / 新有邻居推荐，排在“今日邻人推荐”最前面 */
  newKind?: "joined" | "recommended";
  expanded?: boolean; // 详情页的展开版
  /** 已知是收藏状态（“我的师傅”列表），按钮不用再查接口 */
  favorited?: boolean;
}

/** 第 8 节名片版式：一个组件，列表和详情页复用 */
export default function ProviderCard({ provider: p, isTodayPick, newKind, expanded, favorited }: Props) {
  const founding = isFoundingActive(p.founding_expires_at);
  const summary = p.tagline || (p.description ? p.description.slice(0, 60) : "");
  const tags = expanded ? p.sub_tags : p.sub_tags.slice(0, 3);

  /* 详情页（expanded）版式 —— 1. 头像 + 名字 + 分类徽章（右边是分享按钮，放在外面，不跟着整块链接走） */
  const titleRow = (
      <div className="flex items-center gap-3">
        {p.avatar_url ? (
          // 详情页：头像大一点，点开看完整照片
          <PhotoViewer src={p.avatar_url} alt={`${p.name}的照片`} className="h-16 w-16 rounded-full border object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
            {p.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-gray-900">{p.name}</h3>
            {providerCategoryLabels(p).map((l) => (
              <span key={l} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
  );

  const body = (
    <>
      {/* 2. 推荐数 + 角标 + 执照文案 */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-orange-600">🔥 {p.recommend_count}位邻居推荐</span>
        {founding && p.founding_rank && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            创始商家 #{p.founding_rank} · 还剩 {foundingDaysLeft(p.founding_expires_at)} 天
          </span>
        )}
        {isTodayPick && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">今日推荐</span>
        )}
        {p.is_licensed && <span className="text-xs text-gray-400">自称有执照 · 未经核实</span>}
      </div>

      {/* 3. 一句话标语 */}
      {summary && <p className="mt-2 text-sm text-gray-700">{summary}</p>}

      {/* 4. 技能标签 */}
      {tags.length > 0 && <p className="mt-1 text-sm text-gray-500">{tags.join(" · ")}</p>}

      {/* 5. 服务片区 / 语言 / 急修 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {p.service_areas.length > 0 && <span>服务区域：{formatServiceAreas(p.city_id, p.service_areas)}</span>}
        {p.languages.length > 0 && <span>语言：{p.languages.join("、")}</span>}
        {p.emergency_24h && <span className="rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-600">24h 急修</span>}
      </div>

      {/* 6. 收费提示 */}
      {p.price_note && <p className="mt-1 text-xs text-gray-400">{p.price_note}</p>}
    </>
  );

  /*
   * 列表里的紧凑版：名字一行（太长就省略），下面一行小字是分类；
   * 推荐数和角标一行；标语 / 服务片区各最多一行，超出省略。
   */
  const compactTitle = (
    <div className="flex items-center gap-2.5">
      {p.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
          {p.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold leading-tight text-gray-900">{p.name}</h3>
        <p className="mt-0.5 truncate text-xs text-gray-500">{providerCategoryLabels(p).join(" · ")}</p>
      </div>
    </div>
  );
  const extras = [
    p.service_areas.length > 0 && `服务区域：${formatServiceAreas(p.city_id, p.service_areas)}`,
    p.languages.length > 0 && `语言：${p.languages.join("、")}`,
  ].filter(Boolean);
  const compactBody = (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        {p.recommend_count > 0 ? (
          <span className="text-sm font-semibold text-orange-600">🔥 {p.recommend_count}位邻居推荐</span>
        ) : (
          <span className="text-sm text-gray-500">还没有邻居推荐</span>
        )}
        {newKind && (
          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700">
            {newKind === "joined" ? "新加入" : "新推荐"}
          </span>
        )}
        {isTodayPick && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">今日推荐</span>}
        {founding && p.founding_rank && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
            创始 #{p.founding_rank} · 剩 {foundingDaysLeft(p.founding_expires_at)} 天
          </span>
        )}
        {p.emergency_24h && <span className="rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-600">24h 急修</span>}
        {p.is_licensed && <span className="text-gray-400">自称有执照 · 未经核实</span>}
      </div>
      {(summary || tags.length > 0) && <p className="mt-1 truncate text-sm text-gray-700">{summary || tags.join(" · ")}</p>}
      {extras.length > 0 && <p className="mt-0.5 truncate text-xs text-gray-500">{extras.join(" ｜ ")}</p>}
    </>
  );

  if (!expanded) {
    return (
      <article className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Link href={`/provider/${p.id}`} className="block min-w-0 flex-1">
            {compactTitle}
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <FavoriteButton providerId={p.id} initial={favorited} />
            <ShareButton
              path={`/provider/${p.id}`}
              title={`邻居推荐：${p.name}（${providerCategoryLabel(p)}）`}
              lines={[
                `【邻人帮推荐】${p.name} · ${providerCategoryLabel(p)}`,
                ...(p.sub_tags.length ? [p.sub_tags.join(" · ")] : []),
                ...(p.tagline ? [p.tagline] : []),
              ]}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-700 active:bg-emerald-100"
            />
          </div>
        </div>
        <Link href={`/provider/${p.id}`} className="block">
          {compactBody}
        </Link>
        <div className="mt-2.5">
          <ContactButtons
            providerId={p.id}
            methods={p.contact_methods}
            pref={p.contact_pref}
            hasWechat={p.has_wechat}
            paused={p.status === "paused"}
            compact
          />
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{titleRow}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          <FavoriteButton providerId={p.id} initial={favorited} />
          <ShareButton
            path={`/provider/${p.id}`}
            title={`邻居推荐：${p.name}（${providerCategoryLabel(p)}）`}
            lines={[
              `【邻人帮推荐】${p.name} · ${providerCategoryLabel(p)}`,
              ...(p.sub_tags.length ? [p.sub_tags.join(" · ")] : []),
              ...(p.tagline ? [p.tagline] : []),
            ]}
          />
        </div>
      </div>
      {body}
      {/* 7. 底部双按钮 */}
      <div className="mt-3">
        <ContactButtons
          providerId={p.id}
          methods={p.contact_methods}
          pref={p.contact_pref}
          hasWechat={p.has_wechat}
          paused={p.status === "paused"}
        />
      </div>
    </article>
  );
}
