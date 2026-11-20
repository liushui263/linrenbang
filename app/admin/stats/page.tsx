import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminStats from "@/components/AdminStats";
import { loadAdminStats } from "@/lib/admin-stats-data";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "站长数据看板", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 站长数据看板：只给白名单看，非管理员 404 */
export default async function AdminStatsPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user?.id)) notFound();
  const stats = await loadAdminStats();
  const at = new Date().toLocaleString("zh-CN", { timeZone: "America/Chicago", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4 py-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">站长数据看板</h1>
          <p className="text-xs text-gray-500">截至 {at}（中部时间），只有站长能看</p>
        </div>
        <Link href="/admin" className="shrink-0 text-sm text-emerald-700 underline">
          ← 回审核
        </Link>
      </div>
      <AdminStats s={stats} />
    </div>
  );
}
