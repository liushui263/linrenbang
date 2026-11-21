-- 邻人帮：冷启动期允许匿名推荐（不用登录）
-- 1. recommendations.user_id 可以为空：为空 = 匿名推荐。is_anonymous 由数据库自动算，
--    匿名推荐的人以后登录“认领”了（user_id 填上），is_anonymous 自动变 false。
-- 2. anon_ip_hash：匿名推荐的 IP 哈希（加盐，看不出是谁），只用来限流，不对前端开放。
--    claim_token_hash：提交时发给这个浏览器的认领码的哈希，登录后凭它把推荐认到自己名下。
-- 3. providers.member_recommend_count：登录用户的有效推荐数。
--    名片上的“匿名推荐”小标志 = 有推荐但全是匿名的；有一位登录邻居的推荐通过后，标志自动消失。
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行）。**先运行本文件，再合并/部署新代码。**

alter table public.recommendations alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recommendations' and column_name = 'is_anonymous'
  ) then
    alter table public.recommendations
      add column is_anonymous boolean generated always as (user_id is null) stored,
      add column anon_ip_hash varchar(64),
      add column claim_token_hash varchar(64);
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'providers' and column_name = 'member_recommend_count'
  ) then
    alter table public.providers add column member_recommend_count int not null default 0;
  end if;
end $$;

create index if not exists recommendations_anon_ip_idx on public.recommendations (anon_ip_hash, created_at desc) where anon_ip_hash is not null;
create index if not exists recommendations_claim_idx on public.recommendations (claim_token_hash) where claim_token_hash is not null;

-- 推荐数触发器：同时算总推荐数和登录用户推荐数（都只计 active）
create or replace function public.refresh_recommend_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  for pid in
    select distinct x from unnest(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.provider_id end,
      case when tg_op in ('UPDATE', 'DELETE') then old.provider_id end
    ]) as x where x is not null
  loop
    update public.providers p
       set recommend_count = (select count(*) from public.recommendations r where r.provider_id = pid and r.status = 'active'),
           member_recommend_count = (select count(*) from public.recommendations r where r.provider_id = pid and r.status = 'active' and r.user_id is not null)
     where p.id = pid;
  end loop;
  return null;
end;
$$;

-- 老数据补算一次
update public.providers p
   set member_recommend_count = (select count(*) from public.recommendations r where r.provider_id = p.id and r.status = 'active' and r.user_id is not null);

-- 新列开放给前端读（0001 里用的是列级权限）；anon_ip_hash / claim_token_hash / user_id 不开放
grant select (is_anonymous) on public.recommendations to anon, authenticated;
grant select (member_recommend_count) on public.providers to anon, authenticated;
