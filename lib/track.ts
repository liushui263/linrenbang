/** 前端：记一次商家事件（查看 / 拨号 / 复制微信）。失败不影响页面 */
export function trackProviderEvent(providerId: string, kind: "view" | "call" | "wechat") {
  try {
    void fetch(`/api/providers/${providerId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
      keepalive: true, // 点了拨号页面可能马上跳走，keepalive 保证请求发出去
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
