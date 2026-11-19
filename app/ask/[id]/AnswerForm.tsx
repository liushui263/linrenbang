"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { answerAsk } from "@/app/actions/ask";
import ActionForm, { FieldError } from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { ANSWER_COMMENT_MAX, ANSWER_COMMENT_MIN } from "@/lib/ask";

type Hit = { id: string; name: string; label: string; recommend_count: number; avatar_url: string | null };

/** 回答框：① 搜一位已经在网站上的师傅（没有就去添加新师傅）② 说说经历 */
export default function AnswerForm({ askId, areas, area }: { askId: string; areas: string[]; area: string | null }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Hit | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term || picked) {
      setHits([]);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/providers/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { providers: Hit[] };
        setHits(json.providers ?? []);
      } catch {
        /* 取消或断网 */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, picked]);

  const addNew = (
    <Link href={`/recommend?ask=${askId}`} className="block px-3 py-2.5 text-sm text-emerald-700">
      ➕ 名单里没有？<u>添加一位新师傅</u>
    </Link>
  );

  return (
    <ActionForm action={answerAsk} hideOnSuccess>
      <input type="hidden" name="ask_id" value={askId} />
      <input type="hidden" name="provider_id" value={picked?.id ?? ""} />
      <div>
        <p className="text-sm font-semibold text-gray-800">① 选师傅</p>
        {picked ? (
          <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-300">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {picked.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <b>{picked.name}</b> <span className="text-xs text-gray-500">{picked.label}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setQ("");
              }}
              className="shrink-0 text-xs text-emerald-700 underline"
            >
              换一位
            </button>
          </div>
        ) : (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜师傅名字、店名或技能"
              aria-label="搜师傅"
              className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="mt-1 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {hits.map((h) => (
                <button
                  type="button"
                  key={h.id}
                  onClick={() => setPicked(h)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm active:bg-emerald-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {h.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <b>{h.name}</b>{" "}
                    <span className="text-xs text-gray-500">
                      {h.label} · {h.recommend_count} 人推荐
                    </span>
                  </span>
                </button>
              ))}
              {q.trim() && !searching && hits.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">网站上还没有“{q.trim()}”</p>}
              {addNew}
            </div>
          </>
        )}
        <FieldError name="provider_id" />
      </div>

      {!area && (
        <div>
          <label htmlFor="answer-area" className="text-sm font-semibold text-gray-800">
            你住哪个片区
          </label>
          <select id="answer-area" name="area" defaultValue="" className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5">
            <option value="" disabled>
              选一个
            </option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <FieldError name="area" />
        </div>
      )}

      <div>
        <label htmlFor="answer-comment" className="text-sm font-semibold text-gray-800">
          ② 说说你的经历
        </label>
        <textarea
          id="answer-comment"
          name="comment"
          rows={3}
          maxLength={ANSWER_COMMENT_MAX}
          className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder={`什么时候找的、做了什么、价格怎么样（至少 ${ANSWER_COMMENT_MIN} 个字）`}
        />
        <FieldError name="comment" />
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" name="used_it" defaultChecked className="mt-0.5 h-4 w-4 accent-emerald-600" />
        <span>
          我自己找他做过（不是商家本人）
          <span className="block text-xs text-gray-400">勾上的话，站长审核后也算进师傅名片上的「邻居推荐」</span>
        </span>
      </label>

      <SubmitButton>推荐给这位邻居</SubmitButton>
    </ActionForm>
  );
}
