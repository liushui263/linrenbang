"use client";

import { useState, useTransition } from "react";
import { switchToArea } from "@/app/actions/location";
import { CITY_NOTICE_COOKIE } from "@/constants/cities";
import WaitlistForm from "./WaitlistForm";
import ZipGate from "./ZipGate";

const YEAR = 60 * 60 * 24 * 365;

export interface NearbyCity {
  zh: string;
  areas: { area: string; zip: string }[];
}

interface Props {
  zip: string;
  viewingCity: string; // 当前在看的城市（没开通时是休斯顿）
  nearby: NearbyCity[];
}

/** Zip 所在城市没开通时的提示：能关掉、能换 Zip、能一键切到附近已开通的片区，不挡页面其他操作 */
export default function UnsupportedCityNotice({ zip, viewingCity, nearby }: Props) {
  const [hidden, setHidden] = useState(false);
  const [editingZip, setEditingZip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function dismiss() {
    // 只记住这个 Zip：以后再输别的没开通 Zip 还会提示
    document.cookie = `${CITY_NOTICE_COOKIE}=${zip}; max-age=${YEAR}; path=/; samesite=lax`;
    setHidden(true);
  }

  function switchTo(area: string, areaZip: string) {
    setError(null);
    start(async () => {
      const res = await switchToArea(areaZip, area);
      if (!res.ok) {
        setError(res.error ?? "出错了");
        return;
      }
      try {
        localStorage.setItem("lrb_zip", areaZip);
      } catch {
        /* ignore */
      }
      window.location.reload();
    });
  }

  if (hidden) return null;

  return (
    <div role="status" className="relative rounded-2xl border border-amber-200 bg-amber-50 p-4 pr-10 text-sm text-amber-900">
      <button
        type="button"
        onClick={dismiss}
        aria-label="关闭提示"
        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-amber-700 hover:bg-amber-100"
      >
        ✕
      </button>
      <p>
        你所在的城市（Zip {zip}）还没开通，留个邮箱，有消息通知你。
        <br />
        <strong>当前查看：{viewingCity}</strong>
      </p>

      <WaitlistForm zip={zip} onClose={dismiss} />

      {nearby.map((c) => (
        <div key={c.zh} className="mt-3">
          <p className="text-xs text-amber-800">附近已开通：{c.zh}，点一下直接切换片区</p>
          <div className="-mr-6 mt-1.5 grid grid-cols-2 gap-1.5 sm:mr-0 sm:grid-cols-4">
            {c.areas.map((a) => (
              <button
                key={a.area}
                type="button"
                disabled={pending}
                onClick={() => switchTo(a.area, a.zip)}
                className="flex items-center justify-between gap-1 whitespace-nowrap rounded-full bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-amber-200 hover:ring-amber-400 disabled:opacity-50"
              >
                {a.area} <span className="text-[10px] text-slate-400">{a.zip}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="mt-2 text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={dismiss} className="rounded-lg bg-white px-3 py-1.5 text-amber-900 ring-1 ring-amber-300">
          继续看{viewingCity}
        </button>
        <button type="button" onClick={() => setEditingZip(true)} className="rounded-lg px-3 py-1.5 text-amber-800 underline">
          换个 Zip
        </button>
      </div>

      {editingZip && <ZipGate open currentZip={zip} onClose={() => setEditingZip(false)} />}
    </div>
  );
}
