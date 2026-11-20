"use client";

import { useEffect } from "react";
import { trackProviderEvent } from "@/lib/track";

/** 商家详情页：页面真正在浏览器里打开才算一次“邻居查看”（爬虫一般不跑 JS） */
export default function TrackView({ providerId }: { providerId: string }) {
  useEffect(() => {
    trackProviderEvent(providerId, "view");
  }, [providerId]);
  return null;
}
