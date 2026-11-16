import type { Metadata } from "next";
import Link from "next/link";
import { registerMerchant } from "@/app/actions/merchant";
import ActionForm, { FieldError } from "@/components/ActionForm";
import ProviderFields from "@/components/ProviderFields";
import SubmitButton from "@/components/SubmitButton";
import { FOUNDING_DAYS, ROTATION_POOL_PER_CATEGORY } from "@/constants/site";
import { getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";
import { foundingSlotsLeft } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "商家免费注册",
  description: "师傅/商家免费注册，前 100 名是创始商家（有效期 100 天），每分类前 10 名每天轮换推荐。",
};
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const sp = await searchParams;
  const [user, loc, left] = await Promise.all([getCurrentUser().catch(() => null), getVisitorLocation(), foundingSlotsLeft()]);

  if (sp.submitted) {
    return (
      <div className="space-y-4 py-8">
        <p className="text-center text-3xl">✅</p>
        <p className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-gray-700">
          已提交，站长一般 24 小时内审核。审核通过后按通过顺序算创始名次，前 100 名是创始商家，有效期 {FOUNDING_DAYS}{" "}
          天（自通过日起算，到期后恢复正常排序），每分类前 {ROTATION_POOL_PER_CATEGORY} 名进每日轮换。
        </p>
        <Link href="/merchant" className="block text-center text-emerald-700 underline">
          查看我的名片
        </Link>
      </div>
    );
  }

  const banner = (
    <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
      {left > 0 ? (
        <>
          🎉 创始名额还剩 <strong>{left}</strong> 名。前 100 名审核通过的商家是创始商家（有效期 {FOUNDING_DAYS} 天），每分类前{" "}
          {ROTATION_POOL_PER_CATEGORY} 名每天轮换上首页。不花钱，先到先得。
        </>
      ) : (
        <>创始名额已满。注册后按邻居推荐数正常排序，照样免费。</>
      )}
    </div>
  );

  if (!user) {
    return (
      <div className="space-y-4 py-6">
        <h1 className="text-xl font-bold">商家免费注册</h1>
        {banner}
        <div className="rounded-2xl bg-white p-4 text-sm">
          第一步：用 Google 账号登录（一个账号只能注册一个商家）。
          <Link href="/login?next=/merchant/register" className="mt-3 block rounded-xl bg-emerald-600 py-3 text-center font-medium text-white">
            Google 登录后继续
          </Link>
        </div>
      </div>
    );
  }

  const { data: existing } = await createAdminClient().from("providers").select("id").eq("owner_user_id", user.id).maybeSingle();
  if (existing) {
    return (
      <div className="space-y-4 py-6">
        <h1 className="text-xl font-bold">你已经注册过了</h1>
        <Link href="/merchant" className="text-emerald-700 underline">
          去管理我的名片
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6">
      <h1 className="text-xl font-bold">商家免费注册</h1>
      {banner}
      <ActionForm action={registerMerchant}>
        <ProviderFields cityId={loc.city.id} />
        <div>
          <label className="block text-sm font-medium text-gray-700">头像（选填，JPG/PNG，5MB 内）</label>
          <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" className="mt-1 text-sm" />
            <FieldError name="avatar" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">执照照片（选填，只有站长能看到原图链接）</label>
          <input type="file" name="license_photo" accept="image/jpeg,image/png,image/webp" className="mt-1 text-sm" />
            <FieldError name="license_photo" />
        </div>
        <SubmitButton>提交审核</SubmitButton>
      </ActionForm>
      <p className="text-center text-sm text-gray-500">
        邻居已经帮你登记过了？
        <Link href="/merchant/claim" className="text-emerald-700 underline">
          认领我的店
        </Link>
      </p>
    </div>
  );
}
