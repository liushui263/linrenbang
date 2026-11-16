import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

/** 13.6：sitemap 只有商家页 URL，不含任何联系方式 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [{ url: SITE_URL }, { url: `${SITE_URL}/merchant/register` }];
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return base;
  const { data } = await createAdminClient().from("providers").select("id, updated_at").in("status", ["active", "paused"]);
  return [...base, ...(data ?? []).map((p) => ({ url: `${SITE_URL}/provider/${p.id}`, lastModified: p.updated_at }))];
}
