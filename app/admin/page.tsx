import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  approveClaim,
  approveProvider,
  approveRecommendation,
  hideAsk,
  hideAskAnswer,
  hideProvider,
  hideRecommendation,
  rejectClaim,
  resolveReport,
} from "@/app/actions/admin";
import { providerCategories, providerCategoryLabel } from "@/constants/categories";
import { formatServiceAreas } from "@/constants/cities";
import { CONTACT_METHODS } from "@/constants/site";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { formatUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "站长审核", robots: { index: false } };
export const dynamic = "force-dynamic";

const btn = "rounded-lg px-3 py-1.5 text-sm";
const fmt = (s: string) => new Date(s).toLocaleString("zh-CN", { timeZone: "America/Chicago" });

function Row({ id, approve, hide, approveLabel = "通过", hideLabel = "隐藏" }: {
  id: string;
  approve?: (fd: FormData) => Promise<void>;
  hide?: (fd: FormData) => Promise<void>;
  approveLabel?: string;
  hideLabel?: string;
}) {
  return (
    <div className="mt-2 flex gap-2">
      {approve && (
        <form action={approve}>
          <input type="hidden" name="id" value={id} />
          <button className={`${btn} bg-emerald-600 text-white`}>{approveLabel}</button>
        </form>
      )}
      {hide && (
        <form action={hide}>
          <input type="hidden" name="id" value={id} />
          <button className={`${btn} bg-gray-200 text-gray-700`}>{hideLabel}</button>
        </form>
      )}
    </div>
  );
}

/** 第 9 节 /admin：待审核商家 / 待审核推荐 / 待处理举报 / 认领申请。白名单访问，非管理员 404 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user?.id)) notFound();
  const admin = createAdminClient();

  const since = new Date(Date.now() - 3 * 86400_000).toISOString();
  const [providers, recs, reports, claims, foundingCount, others, asks, answers] = await Promise.all([
    admin
      .from("providers")
      .select("id, name, category, categories, custom_service, city_id, phone, wechat_id, contact_methods, contact_pref, service_areas, tagline, description, source, price_note, created_at")
      .eq("status", "pending")
      .order("created_at"),
    admin
      .from("recommendations")
      .select("id, recommender_area, service_item, cost_approx, comment, created_at, provider_id, providers(name)")
      .eq("status", "pending")
      .order("created_at"),
    admin.from("reports").select("id, target_type, target_id, kind, reason, created_at").eq("status", "open").order("created_at"),
    admin
      .from("claim_requests")
      .select("id, contact_note, created_at, provider_id, providers(name, phone), users(email)")
      .eq("status", "pending")
      .order("created_at"),
    admin.from("providers").select("id", { count: "exact", head: true }).not("founding_rank", "is", null),
    admin.from("providers").select("custom_service").contains("categories", ["other"]).neq("status", "hidden"),
    admin
      .from("asks")
      .select("id, area, title, details, status, answer_count, created_at, users(email)")
      .neq("status", "hidden")
      .gt("created_at", since)
      .order("created_at", { ascending: false }),
    admin
      .from("ask_answers")
      .select("id, ask_id, comment, used_it, recommender_area, created_at, providers(name), asks(title), users(email)")
      .eq("status", "active")
      .gt("created_at", since)
      .order("created_at", { ascending: false }),
  ]);

  // “其他服务”里哪些服务名出现得多，方便以后升级成正式分类
  const otherCounts = Object.entries(
    (others.data ?? []).reduce<Record<string, number>>((acc, r) => {
      const k = (r.custom_service ?? "").trim();
      if (k) acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const name = (x: unknown) => (x as { name?: string } | null)?.name ?? "";

  return (
    <div className="space-y-8 py-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">站长审核</h1>
          <p className="text-sm text-gray-500">创始名额已用 {foundingCount.count ?? 0} / 100</p>
        </div>
        <Link href="/admin/stats" className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white">
          📊 数据看板
        </Link>
      </div>

      {otherCounts.length > 0 && (
        <section className="rounded-2xl bg-white p-4 text-sm">
          <h2 className="font-semibold">“其他服务”里的服务名（{others.data?.length ?? 0} 家）</h2>
          <p className="mt-1 text-xs text-gray-500">出现多的可以考虑升级成正式分类。</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {otherCounts.map(([name, n]) => (
              <span key={name} className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-800">
                {name} × {n}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">待审核商家（{providers.data?.length ?? 0}）</h2>
        <p className="mb-2 text-xs text-gray-500">标准：电话正常、店名/分类/片区填全、简介无乱码无其他平台链接、无明显虚假承诺、不是重复注册。</p>
        <div className="space-y-3">
          {providers.data?.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white p-4 text-sm">
              <div className="font-semibold">
                {p.name} · {providerCategoryLabel(p)}
                {providerCategories(p).includes("other") && <span className="ml-2 rounded bg-purple-50 px-1.5 text-xs text-purple-700">其他服务</span>}
                {p.source === "neighbor_submitted" && <span className="ml-2 text-xs text-blue-600">邻居代录入</span>}
              </div>
              <div className="text-gray-600">
                {formatUsPhone(p.phone)} {p.wechat_id && `· 微信 ${p.wechat_id}`} · {formatServiceAreas(p.city_id, p.service_areas)}
                <br />
                联系：{CONTACT_METHODS.filter((m) => p.contact_methods?.includes(m.id)).map((m) => m.zh).join(" / ")}
                {p.contact_pref && ` · ${CONTACT_METHODS.find((m) => m.id === p.contact_pref)?.pref ?? ""}`}
              </div>
              {p.tagline && <div className="text-gray-600">{p.tagline}</div>}
              {p.description && <div className="text-gray-500">{p.description}</div>}
              {p.price_note && <div className="text-gray-400">{p.price_note}</div>}
              <div className="text-xs text-gray-400">{fmt(p.created_at)}</div>
              <Row id={p.id} approve={approveProvider} hide={hideProvider} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">待审核推荐（{recs.data?.length ?? 0}）</h2>
        <p className="mb-2 text-xs text-gray-500">标准：至少有一句具体的事（修了什么、多少钱、多快）。空话、刷单、自荐直接隐藏。</p>
        <div className="space-y-3">
          {recs.data?.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4 text-sm">
              <Link href={`/provider/${r.provider_id}`} className="font-semibold text-emerald-700 underline">
                {name(r.providers)}
              </Link>
              <div className="text-gray-500">
                {r.recommender_area} {r.service_item && `· ${r.service_item}`} {r.cost_approx && `· ${r.cost_approx}`}
              </div>
              <div>{r.comment}</div>
              <Row id={r.id} approve={approveRecommendation} hide={hideRecommendation} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">待处理举报 / 下架申请（{reports.data?.length ?? 0}）</h2>
        <p className="mb-2 text-xs text-gray-500">24 小时内处理，先隐藏再核实。</p>
        <div className="space-y-3">
          {reports.data?.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4 text-sm">
              <div className="font-semibold">
                {r.kind === "takedown"
                  ? "商家申请下架"
                  : ({ provider: "举报商家", recommendation: "举报推荐", ask: "举报求推荐", ask_answer: "举报求推荐的回答" } as Record<string, string>)[
                      r.target_type
                    ]}
              </div>
              {r.target_type === "provider" && (
                <Link href={`/provider/${r.target_id}`} className="text-xs text-emerald-700 underline">
                  查看商家
                </Link>
              )}
              {r.target_type === "ask" && (
                <Link href={`/ask/${r.target_id}`} className="text-xs text-emerald-700 underline">
                  查看提问
                </Link>
              )}
              <div className="mt-1">{r.reason}</div>
              <div className="text-xs text-gray-400">{fmt(r.created_at)}</div>
              <div className="mt-2 flex gap-2">
                <form action={resolveReport}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="hide" value="1" />
                  <button className={`${btn} bg-red-600 text-white`}>隐藏并结案</button>
                </form>
                <form action={resolveReport}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className={`${btn} bg-gray-200 text-gray-700`}>不处理，结案</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">最近 3 天的求推荐（{asks.data?.length ?? 0}）</h2>
        <p className="mb-2 text-xs text-gray-500">先发后管：广告、留联系方式、商家自问自答、骂人的直接隐藏。</p>
        <div className="space-y-3">
          {asks.data?.map((a) => (
            <div key={a.id} className="rounded-2xl bg-white p-4 text-sm">
              <Link href={`/ask/${a.id}`} className="font-semibold text-emerald-700 underline">
                {a.area} · {a.title}
              </Link>
              {a.details && <div className="text-gray-600">{a.details}</div>}
              <div className="text-xs text-gray-400">
                {(a.users as unknown as { email: string } | null)?.email} · {fmt(a.created_at)} · {a.answer_count} 个回答
                {a.status === "closed" && " · 已关闭"}
              </div>
              <Row id={a.id} hide={hideAsk} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">最近 3 天的回答（{answers.data?.length ?? 0}）</h2>
        <p className="mb-2 text-xs text-gray-500">勾了“自己用过”的回答，另外会在“待审核推荐”里出现一条，通过后才算进推荐数。</p>
        <div className="space-y-3">
          {answers.data?.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4 text-sm">
              <div className="font-semibold">
                {name(r.providers)} <span className="font-normal text-gray-500">← {(r.asks as unknown as { title: string } | null)?.title}</span>
              </div>
              <div>{r.comment}</div>
              <div className="text-xs text-gray-400">
                {(r.users as unknown as { email: string } | null)?.email} · {r.recommender_area} · {fmt(r.created_at)}
                {r.used_it && " · 自己用过"}
              </div>
              <Row id={r.id} hide={hideAskAnswer} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">认领申请（{claims.data?.length ?? 0}）</h2>
        <p className="mb-2 text-xs text-gray-500">先打电话或加微信核实是本人，再通过。</p>
        <div className="space-y-3">
          {claims.data?.map((c) => {
            const pr = c.providers as unknown as { name: string; phone: string } | null;
            const u = c.users as unknown as { email: string } | null;
            return (
              <div key={c.id} className="rounded-2xl bg-white p-4 text-sm">
                <div className="font-semibold">
                  {pr?.name} · {pr && formatUsPhone(pr.phone)}
                </div>
                <div className="text-gray-600">申请人：{u?.email}</div>
                <div className="text-gray-600">联系方式：{c.contact_note}</div>
                <Row id={c.id} approve={approveClaim} hide={rejectClaim} hideLabel="拒绝" />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
