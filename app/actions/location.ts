"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { cityForZip, DEFAULT_CITY_ID, getCity, isValidZip } from "@/constants/cities";
import { getCurrentUser } from "@/lib/auth";
import { AREA_COOKIE, ZIP_COOKIE } from "@/lib/location";
import { createAdminClient } from "@/lib/supabase/admin";

const YEAR = 60 * 60 * 24 * 365;

/** 保存 Zip：游客存 cookie（前端另存 localStorage），登录用户再写 users.home_zip */
export async function saveZip(zip: string | null): Promise<{ ok: boolean; live: boolean; error?: string }> {
  const store = await cookies();
  if (zip === null) {
    // 跳过：默认休斯顿
    store.set(ZIP_COOKIE, "", { maxAge: YEAR, path: "/", sameSite: "lax" });
    revalidatePath("/", "layout");
    return { ok: true, live: true };
  }
  if (!isValidZip(zip)) return { ok: false, live: false, error: "请输入 5 位数字的 Zip Code" };
  store.set(ZIP_COOKIE, zip, { maxAge: YEAR, path: "/", sameSite: "lax" });
  store.delete(AREA_COOKIE);
  const city = cityForZip(zip);

  const user = await getCurrentUser();
  if (user) {
    await createAdminClient()
      .from("users")
      .update({ home_zip: zip, home_city_id: city?.id ?? DEFAULT_CITY_ID })
      .eq("id", user.id);
  }
  revalidatePath("/", "layout");
  return { ok: true, live: !!city };
}

export async function saveArea(area: string | null) {
  const store = await cookies();
  const zip = store.get(ZIP_COOKIE)?.value;
  const city = (zip && cityForZip(zip)) || getCity(null);
  if (area && city.areas.includes(area)) {
    store.set(AREA_COOKIE, area, { maxAge: YEAR, path: "/", sameSite: "lax" });
  } else {
    store.delete(AREA_COOKIE);
  }
  revalidatePath("/", "layout");
}

export async function joinWaitlist(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const zip = String(formData.get("zip") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return { ok: false, error: "邮箱格式不对" };
  if (!isValidZip(zip)) return { ok: false, error: "Zip 不对" };
  await createAdminClient().from("city_waitlist").upsert({ email, zip }, { onConflict: "email,zip", ignoreDuplicates: true });
  return { ok: true };
}
