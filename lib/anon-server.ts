import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";

const salt = () => process.env.CONTACT_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || "linrenbang";

/** 访客 IP 的加盐哈希（只用来限流，看不出是谁） */
export async function visitorIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${salt()}:anon:${ip}`).digest("hex");
}

/** 新认领码：明文只放在推荐人浏览器的 cookie 里，数据库只存哈希 */
export function newClaimToken(): string {
  return randomBytes(16).toString("hex");
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(`claim:${token}`).digest("hex");
}
