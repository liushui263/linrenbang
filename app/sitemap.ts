import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

/** 13.6：sitemap 只有商家页和求推荐页 URL，不含任何联系方式 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [{ url: SITE_URL }, { url: `${SITE_URL}/merchant/register` }, { url: `${SITE_URL}/ask` }];
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return base;
  const admin = createAdminClient();
  const [{ data }, { data: asks }] = await Promise.all([
    admin.from("providers").select("id, updated_at").in("status", ["active", "paused"]),
    admin.from("asks").select("id, updated_at").in("status", ["open", "closed"]),
  ]);
  return [
    ...base,
    ...(data ?? []).map((p) => ({ url: `${SITE_URL}/provider/${p.id}`, lastModified: p.updated_at })),
    ...(asks ?? []).map((a) => ({ url: `${SITE_URL}/ask/${a.id}`, lastModified: a.updated_at })),
  ];
}
