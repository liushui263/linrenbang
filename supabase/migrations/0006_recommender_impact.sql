-- 邻人帮：推荐有回音（让推荐人看到“你推荐的师傅本周被几位邻居查看、拨打”）
-- 新增 provider_events：商家详情页“查看”、“一键拨号”、“复制微信”三种事件。
--   - 不存 IP、不存账号：visitor_hash 是“盐 + IP + 浏览器标识（或登录账号）”的哈希，看不出是谁
--   - 同一位访客、同一商家、同一种事件、同一天（美国中部时间）只记 1 次（唯一约束去重）
--   - 前端（anon key）读写不到这张表，只有服务端能写、能统计
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行）。部署新代码之前先运行。
-- 注：编号 0006（0004 求推荐、0005 我的师傅在别的分支）。三者互不依赖，按编号顺序运行即可。

create table if not exists public.provider_events (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.providers (id) on delete cascade,
  kind varchar(10) not null check (kind in ('view', 'call', 'wechat')),
  visitor_hash varchar(64) not null,
  day date not null,
  created_at timestamptz not null default now(),
  unique (provider_id, kind, visitor_hash, day)
);
create index if not exists provider_events_provider_day_idx on public.provider_events (provider_id, day);

alter table public.provider_events enable row level security;
-- 不建任何 policy：anon / authenticated 读写不到，service role 绕过 RLS

-- 按商家统计某天以来的“不同访客数”（同一个人一周看 3 天只算 1 位邻居）
create or replace function public.provider_event_counts(p_provider_ids uuid[], p_since date)
returns table (provider_id uuid, views bigint, calls bigint, wechats bigint)
language sql
stable
as $$
  select
    e.provider_id,
    count(distinct e.visitor_hash) filter (where e.kind = 'view')   as views,
    count(distinct e.visitor_hash) filter (where e.kind = 'call')   as calls,
    count(distinct e.visitor_hash) filter (where e.kind = 'wechat') as wechats
  from public.provider_events e
  where e.provider_id = any (p_provider_ids)
    and e.day >= p_since
  group by e.provider_id;
$$;

revoke all on function public.provider_event_counts(uuid[], date) from public, anon, authenticated;
grant execute on function public.provider_event_counts(uuid[], date) to service_role;
