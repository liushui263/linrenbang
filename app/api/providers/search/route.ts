import { NextResponse, type NextRequest } from "next/server";
import { providerCategoryLabel } from "@/constants/categories";
import { getVisitorLocation } from "@/lib/location";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

/** 求推荐回答框里搜师傅：只返回名字、分类、推荐数（公开字段），不含电话微信 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 30);
  if (!q) return NextResponse.json({ providers: [] });
  const loc = await getVisitorLocation();
  const { providers } = await listProviders({ cityId: loc.city.id, q });
  return NextResponse.json(
    {
      providers: providers.slice(0, 8).map((p) => ({
        id: p.id,
        name: p.name,
        label: providerCategoryLabel(p),
        recommend_count: p.recommend_count,
        avatar_url: p.avatar_url,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
