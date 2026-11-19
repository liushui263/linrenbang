import type { Metadata } from "next";
import Link from "next/link";
import { createAsk } from "@/app/actions/ask";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { findGroup } from "@/constants/categories";
import { titleFromSearch } from "@/lib/ask";
import { getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";
import AskFields from "./AskFields";

export const metadata: Metadata = { title: "问问邻居", robots: { index: false } };
export const dynamic = "force-dynamic";

type SP = { q?: string; area?: string; group?: string };

export default async function NewAskPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [user, loc] = await Promise.all([getCurrentUser().catch(() => null), getVisitorLocation()]);
  const title = titleFromSearch(sp.q);
  const area = sp.area && loc.city.areas.includes(sp.area) ? sp.area : (loc.area ?? undefined);
  const group = findGroup(sp.group)?.id;
  const here = `/ask/new?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`;

  return (
    <div className="space-y-4 py-4">
      <section>
        <Link href="/ask" className="text-sm text-emerald-700">
          ‹ 全部求推荐
        </Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">问问邻居</h1>
        <p className="mt-0.5 text-sm text-gray-500">发出后，附近用过的邻居可以直接推荐师傅给你。</p>
      </section>

      {!user ? (
        <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {title && (
            <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <p className="text-xs text-amber-800">帮你写好了，登录后还能改：</p>
              <p className="mt-1 font-semibold text-gray-900">{title}</p>
            </div>
          )}
          <p className="text-sm text-gray-600">发求推荐要先用 Google 登录（一分钟）。登录是为了防止刷屏，看帖不用登录。</p>
          <Link
            href={`/login?next=${encodeURIComponent(here)}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 text-base font-semibold text-gray-800 shadow-sm"
          >
            <span className="text-lg font-bold text-blue-600">G</span>
            用 Google 登录再发布
          </Link>
          <p className="text-center text-xs text-gray-400">手机短信、微信登录暂不支持。</p>
        </section>
      ) : (
        <ActionForm action={createAsk}>
          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <AskFields title={title} group={group} areas={loc.city.areas} area={area} zip={loc.zip} />
            <div className="rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
              👤 别人只看到「<b>片区 + 邻居</b>」，如「Katy 邻居」，不显示你的名字和账号。
              <br />
              🚫 不要写电话、微信、门牌号；广告和商家自问自答会被删除。
            </div>
          </section>
          <SubmitButton>发布求推荐</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
