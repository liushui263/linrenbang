-- 邻人帮：“我的师傅”收藏
-- 登录用户一键收藏用过的、想用的师傅，在“我的”页面直接找到、直接拨号。
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行）。部署新代码之前先运行。

create table if not exists public.favorites (
  user_id uuid not null references public.users (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, provider_id)
);

-- 按商家统计被收藏次数（以后给商家/推荐人看“被几位邻居收藏”用）
create index if not exists favorites_provider_idx on public.favorites (provider_id);

-- 只能读自己的收藏；写操作和其他表一样只走服务端 service role
alter table public.favorites enable row level security;
drop policy if exists favorites_self_read on public.favorites;
create policy favorites_self_read on public.favorites for select to authenticated using (user_id = auth.uid());
revoke all on public.favorites from anon;
revoke insert, update, delete on public.favorites from authenticated;
grant select on public.favorites to authenticated;
