/** 把美国号码规范成 E.164（+1XXXXXXXXXX）；无法识别返回 null */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** +17135550101 → (713) 555-0101 */
export function formatUsPhone(e164: string | null | undefined): string {
  if (!e164) return "（没有电话）";
  const d = e164.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return e164;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
