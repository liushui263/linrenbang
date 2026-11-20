"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setFavorite } from "@/app/actions/favorite";

type FavState = { signedIn: boolean; ids: Set<string> };

// 一个页面上有很多张名片：只请求一次收藏列表，所有按钮共用
let shared: Promise<FavState> | null = null;
const listeners = new Set<() => void>();

function loadFavorites(): Promise<FavState> {
  if (!shared) {
    shared = fetch("/api/favorites", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { signedIn: false, ids: [] }))
      .then((j: { signedIn: boolean; ids: string[] }) => ({ signedIn: j.signedIn, ids: new Set(j.ids) }))
      .catch(() => ({ signedIn: false, ids: new Set<string>() }));
  }
  return shared;
}

async function updateShared(id: string, on: boolean) {
  const s = await loadFavorites();
  if (on) s.ids.add(id);
  else s.ids.delete(id);
  listeners.forEach((fn) => fn());
}

/** 名片右上角的“收藏”按钮：登录用户一键收进“我的师傅” */
export default function FavoriteButton({ providerId, initial }: { providerId: string; initial?: boolean }) {
  const pathname = usePathname();
  const [fav, setFav] = useState<boolean>(initial ?? false);
  const [signedIn, setSignedIn] = useState<boolean | null>(initial === undefined ? null : true);
  const [askLogin, setAskLogin] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    const sync = () =>
      loadFavorites().then((s) => {
        if (!alive) return;
        setSignedIn(s.signedIn);
        setFav(s.ids.has(providerId));
      });
    // 页面里已经知道是收藏状态（比如“我的师傅”列表）就不用等接口
    if (initial === undefined) sync();
    listeners.add(sync);
    return () => {
      alive = false;
      listeners.delete(sync);
    };
  }, [providerId, initial]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  function onClick() {
    if (signedIn === false) {
      setAskLogin(true);
      return;
    }
    const next = !fav;
    setFav(next); // 先变，失败再改回来
    start(async () => {
      const res = await setFavorite(providerId, next);
      if (res.needLogin) {
        setFav(!next);
        setSignedIn(false);
        setAskLogin(true);
        return;
      }
      if (!res.ok) {
        setFav(!next);
        flash(res.error ?? "没收藏成功，请再试一次");
        return;
      }
      await updateShared(providerId, next);
      flash(next ? "已收藏，在“我的 · 我的师傅”里找" : "已取消收藏");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={fav}
        aria-label={fav ? "取消收藏" : "收藏到我的师傅"}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm sm:px-3 font-medium disabled:opacity-60 ${
          fav
            ? "border-amber-300 bg-amber-50 text-amber-700 active:bg-amber-100"
            : "border-gray-200 bg-white text-gray-600 active:bg-gray-50"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path
            d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"
            strokeLinejoin="round"
          />
        </svg>
        {/* 手机上只留星星，给店名留位置；宽屏显示文字 */}
        <span className="hidden sm:inline">{fav ? "已收藏" : "收藏"}</span>
      </button>

      {askLogin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAskLogin(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-gray-900">登录后就能收藏师傅</p>
            <p className="mt-1 text-sm text-gray-600">收藏的师傅都在“我的 · 我的师傅”里，下次不用再搜，直接拨号。</p>
            <Link
              href={`/login?next=${encodeURIComponent(pathname || "/")}`}
              className="mt-4 block w-full rounded-xl bg-emerald-600 py-3 text-center font-medium text-white"
            >
              去登录
            </Link>
            <button type="button" onClick={() => setAskLogin(false)} className="mt-2 w-full py-2 text-sm text-gray-500">
              先不用
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-black/80 px-4 py-2 text-sm text-white">
          {toast}
        </div>
      )}
    </>
  );
}
