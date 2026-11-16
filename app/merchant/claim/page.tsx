import type { Metadata } from "next";
import Link from "next/link";
import { requestClaim } from "@/app/actions/merchant";
import ActionForm, { FieldError } from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "认领我的店" };
export const dynamic = "force-dynamic";

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const sp = await searchParams;
  // 从注册页“电话已登记”跳过来时带着电话，只保留电话里会出现的字符
  const phone = (sp.phone ?? "").replace(/[^\d+()\- ]/g, "").slice(0, 20);
  const user = await getCurrentUser().catch(() => null);
  const self = phone ? `/merchant/claim?phone=${encodeURIComponent(phone)}` : "/merchant/claim";
  return (
    <div className="space-y-4 py-6">
      <h1 className="text-xl font-bold">认领我的店</h1>
      <p className="text-sm text-gray-600">
        邻居帮你登记过？填上店的电话，站长会通过电话或微信跟你核实本人，通过后你就能自己管理名片。
      </p>
      {!user ? (
        <Link href={`/login?next=${encodeURIComponent(self)}`} className="block rounded-xl bg-emerald-600 py-3 text-center font-medium text-white">
          Google 登录后继续
        </Link>
      ) : (
        <ActionForm action={requestClaim} hideOnSuccess>
          <div>
            <label className="block text-sm font-medium text-gray-700">店的电话 *</label>
            <input name="phone" required inputMode="tel" defaultValue={phone} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2" />
            <FieldError name="phone" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">站长怎么联系你核实 *</label>
            <input
              name="contact_note"
              required
              maxLength={200}
              placeholder="如：微信 laowang123，晚上 7 点后方便"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
            />
            <FieldError name="contact_note" />
          </div>
          <SubmitButton>提交认领申请</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
