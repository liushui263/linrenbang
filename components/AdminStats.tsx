import type { DayPoint, Ranked, Stats } from "@/lib/admin-stats";

const WEEKDAY_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const one = (x: number) => (Math.round(x * 10) / 10).toString();

function hourZh(h: number) {
  const part = h < 6 ? "凌晨" : h < 12 ? "上午" : h < 13 ? "中午" : h < 18 ? "下午" : "晚上";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${part} ${h12} 点`;
}

function Trend({ now, last }: { now: number; last: number }) {
  if (now === last) return <span className="text-gray-400">和上周一样</span>;
  if (last === 0) return <span className="text-emerald-600">上周 0</span>;
  const diff = (now - last) / last;
  return <span className={diff > 0 ? "text-emerald-600" : "text-rose-600"}>{diff > 0 ? "↑" : "↓"} {pct(Math.abs(diff))}（上周 {last}）</span>;
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function Bars({ title, points, color }: { title: string; points: DayPoint[]; color: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-gray-500">
        <span>{title}</span>
        <span className="tabular-nums">30 天共 {total}</span>
      </div>
      <div className="mt-1 flex h-16 items-end gap-[2px]" role="img" aria-label={`${title}，最近 30 天共 ${total}`}>
        {points.map((p) => (
          <div
            key={p.day}
            title={`${p.day.slice(5)}：${p.value}`}
            className={`flex-1 rounded-t-sm ${p.value ? color : "bg-gray-100"}`}
            style={{ height: p.value ? `${Math.max(8, (p.value / max) * 100)}%` : "4px" }}
          />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
        <span>{points[0]?.day.slice(5)}</span>
        <span>今天</span>
      </div>
    </div>
  );
}

function Top({ title, items, unit, empty = "还没有数据" }: { title: string; items: Ranked[]; unit: string; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="rounded-2xl bg-white p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">{empty}</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {items.map((it, i) => (
            <li key={`${it.label}-${i}`} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="mr-1 text-gray-400">{i + 1}</span>
                  {it.label}
                  {it.sub && <span className="ml-1 text-xs text-gray-400">{it.sub}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-gray-600">
                  {it.value} {unit}
                </span>
              </div>
              <div className="mt-0.5 h-1 rounded-full bg-gray-100">
                <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${(it.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** 站长后台的数据看板 */
export default function AdminStats({ s }: { s: Stats }) {
  const t = s.totals;
  const fun: string[] = [];
  if (s.busiestHour) fun.push(`邻居最爱在${hourZh(s.busiestHour.hour)}左右上站，${s.busiestWeekday ? WEEKDAY_ZH[s.busiestWeekday.weekday] : ""}最热闹。`);
  if (s.topProviders[0]) fun.push(`人气王是「${s.topProviders[0].label}」，攒了 ${s.topProviders[0].value} 条邻居推荐。`);
  if (s.topRecommenders[0]) fun.push(`最热心的是 ${s.topRecommenders[0].sub ?? ""} 的${s.topRecommenders[0].label}，一个人推荐了 ${s.topRecommenders[0].value} 家。`);
  if (s.topServiceItems[0]) fun.push(`邻居推荐里最常出现的活儿是「${s.topServiceItems[0].label}」（${s.topServiceItems[0].value} 次）。`);
  if (s.asks.helped > 0) fun.push(`求推荐帖里已经帮成 ${s.asks.helped} 次（发帖人关帖时选了最后找的那位）。`);
  if (t.neighborSubmitted > 0) fun.push(`${t.neighborSubmitted} 家商家是邻居代录入的，其中已有 ${t.claimed} 家被商家本人认领。`);
  if (s.firstUserDay) fun.push(`第一位用户在 ${s.firstUserDay} 注册，到今天平均每家商家有 ${one(s.avgRecsPerProvider)} 条推荐。`);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile label="注册用户" value={t.users} sub={`本周新增 ${t.usersWeek} · 7 天内登录 ${t.activeWeek}`} />
        <Tile label="上线商家" value={t.providersLive} sub={`本周新增 ${t.providersWeek} · 待审 ${t.providersPending}${t.providersPaused ? ` · 暂停 ${t.providersPaused}` : ""}`} />
        <Tile label="推荐人" value={t.recommenders} sub={t.users ? `占注册用户 ${pct(t.recommenders / t.users)}` : undefined} />
        <Tile label="邻居推荐" value={t.recs} sub={`本周新增 ${t.recsWeek} · 待审 ${t.recsPending}`} />
        <Tile label="收藏" value={t.favorites} sub="邻居存下来的名片" />
        <Tile label="创始名额剩余" value={`${s.founding.left}`} sub={`已用 ${s.founding.used} / 100`} />
      </div>

      <section className="space-y-4 rounded-2xl bg-white p-4">
        <h3 className="text-sm font-semibold">最近 30 天</h3>
        <Bars title="每天新注册" points={s.growth.users} color="bg-sky-500" />
        <Bars title="每天新推荐（已通过）" points={s.growth.recs} color="bg-emerald-500" />
      </section>

      <section className="rounded-2xl bg-white p-4 text-sm">
        <h3 className="font-semibold">本周邻居动作（7 天）</h3>
        <p className="mt-0.5 text-xs text-gray-400">每位访客每天每家每种只算一次；爬虫、商家自己看自己不算。</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xl font-bold tabular-nums">{s.week.views}</div>
            <div className="text-xs text-gray-500">看名片</div>
            <div className="text-[11px]"><Trend now={s.week.views} last={s.week.lastViews} /></div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">{s.week.calls}</div>
            <div className="text-xs text-gray-500">拨号</div>
            <div className="text-[11px]"><Trend now={s.week.calls} last={s.week.lastCalls} /></div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">{s.week.wechats}</div>
            <div className="text-xs text-gray-500">复制微信</div>
            <div className="text-[11px]"><Trend now={s.week.wechats} last={s.week.lastWechats} /></div>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">本周约 {s.week.visitors} 位不同的邻居看过商家名片。</p>
      </section>

      {fun.length > 0 && (
        <section className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <h3 className="font-semibold">🎉 有点好玩的</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {fun.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Top title="🏆 推荐最多的商家" items={s.topProviders} unit="条" />
        <Top title="📞 本周最多人联系" items={s.topCalledWeek} unit="人" empty="本周还没人拨号或加微信" />
        <Top title="🙋 最热心的推荐人" items={s.topRecommenders} unit="家" />
        <Top title="❤️ 收藏最多" items={s.topFavorited} unit="人" />
        <Top title="📍 推荐人最多的片区" items={s.topAreas} unit="条" />
        <Top title="🧰 商家最多的分类" items={s.topCategories} unit="家" />
        <Top title="🔨 推荐里最常见的活儿" items={s.topServiceItems} unit="次" />
        <Top title="🔑 登录方式" items={s.loginMethods} unit="人" />
      </div>

      <section className="rounded-2xl bg-white p-4 text-sm">
        <h3 className="font-semibold">求推荐</h3>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xl font-bold tabular-nums">{s.asks.total}</div>
            <div className="text-xs text-gray-500">帖子</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">{pct(s.asks.answeredRate)}</div>
            <div className="text-xs text-gray-500">有人回答</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">{one(s.asks.avgAnswers)}</div>
            <div className="text-xs text-gray-500">平均回答数</div>
          </div>
        </div>
      </section>

      {s.zeroRecProviders > 0 && (
        <p className="rounded-2xl bg-white p-4 text-sm text-gray-600">
          还有 <b>{s.zeroRecProviders}</b> 家上线商家一条推荐都没有，可以在群里请用过的邻居帮忙写一句。
        </p>
      )}
    </div>
  );
}
