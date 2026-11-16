/** 只允许站内相对路径，防止登录后被跳到外站 */
export function safeNext(next: string | undefined | null, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
