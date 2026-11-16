-- 邻人帮 v3.2 初始数据库
-- 在 Supabase SQL Editor 里整段运行一次即可。
-- 设计原则：前端 anon key 只能读公开数据；所有写操作走服务端（service role），
-- 由服务端代码做登录、归属、站长白名单（ADMIN_USER_IDS）校验。

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users：和 auth.users 一一对应，注册时由触发器自动建行
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone varchar(20),               -- E.164，v3 不做短信验证，字段先保留
  phone_verified boolean not null default false,
  display_name varchar(40),
  neighborhood varchar(40),
  home_zip varchar(10),
  home_city_id varchar(20) not null default 'houston',
  role varchar(20) not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- providers：商家名片
-- ---------------------------------------------------------------------------
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  city_id varchar(20) not null default 'houston',
  owner_user_id uuid references public.users (id) on delete set null,
  submitted_by_user_id uuid references public.users (id) on delete set null,
  source varchar(30) not null default 'self_registered', -- self_registered / neighbor_submitted / seed
  name varchar(60) not null,
  category varchar(30) not null,
  sub_tags text[] not null default '{}',
  service_areas text[] not null default '{}',
  service_zips text[] not null default '{}',
  phone varchar(20) not null,      -- E.164，全站唯一；匿名不可读（见下方列权限）
  wechat_id varchar(60),           -- 匿名不可读
  has_wechat boolean generated always as (wechat_id is not null and length(trim(wechat_id)) > 0) stored,
  languages text[] not null default '{}',
  avatar_url text,
  tagline varchar(60),
  is_licensed boolean not null default false, -- 商家自称
  license_number varchar(60),
  license_photo_url text,
  license_status varchar(20) not null default 'unclaimed'
    check (license_status in ('unclaimed', 'self_claimed', 'doc_uploaded', 'verified')),
  is_insured boolean not null default false,
  emergency_24h boolean not null default false,
  price_note varchar(150),
  description varchar(300),
  recommend_count int not null default 0,
  is_claimed boolean not null default false,
  status varchar(20) not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'hidden')),
  is_founding boolean not null default false,       -- 历史标记；是否“有效创始”一律按 founding_expires_at 判断
  founding_rank int check (founding_rank between 1 and 100),
  founding_started_at timestamptz,
  founding_expires_at timestamptz,
  category_rank int,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint providers_phone_unique unique (phone),
  constraint providers_founding_window check (founding_expires_at is null or founding_expires_at > founding_started_at)
);

-- 一个 Google 账号只能拥有一个商家
create unique index if not exists providers_owner_unique on public.providers (owner_user_id) where owner_user_id is not null;
create unique index if not exists providers_founding_rank_unique on public.providers (founding_rank) where founding_rank is not null;
create index if not exists providers_list_idx on public.providers (city_id, category, recommend_count desc);
create index if not exists providers_status_idx on public.providers (status);
create index if not exists providers_rotation_idx on public.providers (city_id, category, founding_started_at) where founding_rank is not null;
create index if not exists providers_areas_gin on public.providers using gin (service_areas);
create index if not exists providers_tags_gin on public.providers using gin (sub_tags);
create index if not exists providers_name_trgm on public.providers using gin (name gin_trgm_ops);
create index if not exists providers_desc_trgm on public.providers using gin (description gin_trgm_ops);
create index if not exists providers_tagline_trgm on public.providers using gin (tagline gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- recommendations：邻居推荐
-- ---------------------------------------------------------------------------
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  recommender_area varchar(40) not null,
  service_item varchar(60),
  cost_approx varchar(40),
  comment varchar(300) not null,
  status varchar(20) not null default 'pending' check (status in ('pending', 'active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recommendations_one_per_user unique (provider_id, user_id)
);
create index if not exists recommendations_provider_idx on public.recommendations (provider_id, status);

-- ---------------------------------------------------------------------------
-- ad_placements：v3 不收费，只存每日轮换记录（Lazy Write）
-- ---------------------------------------------------------------------------
create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  city_id varchar(20) not null default 'houston',
  slot_type varchar(30) not null check (slot_type in ('home_rotation', 'category_rotation')),
  category varchar(30),
  rotation_date date not null,      -- America/Chicago 自然日
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_free_grant boolean not null default true,
  amount_cents int not null default 0,
  paid_via varchar(20),             -- 以后收费再用，v3 留空
  paid_at timestamptz,              -- 同上
  created_at timestamptz not null default now(),
  constraint ad_placements_window check (end_at > start_at)
);
create unique index if not exists ad_placements_unique_day
  on public.ad_placements (city_id, slot_type, coalesce(category, ''), provider_id, rotation_date);

-- ---------------------------------------------------------------------------
-- 辅助表：举报、认领申请、未开通城市留邮箱、联系方式取用计数（限流）
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type varchar(20) not null check (target_type in ('provider', 'recommendation')),
  target_id uuid not null,
  kind varchar(20) not null default 'report' check (kind in ('report', 'takedown')),
  reason varchar(300) not null,
  reporter_user_id uuid references public.users (id) on delete set null,
  status varchar(20) not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  contact_note varchar(200) not null, -- 站长怎么联系核实（微信号/方便的时间）
  status varchar(20) not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint claim_requests_one_per_user unique (provider_id, user_id)
);

create table if not exists public.city_waitlist (
  id uuid primary key default gen_random_uuid(),
  email varchar(120) not null,
  zip varchar(10) not null,
  created_at timestamptz not null default now(),
  constraint city_waitlist_unique unique (email, zip)
);

create table if not exists public.contact_reveals (
  id bigint generated always as identity primary key,
  ip_hash varchar(64) not null,
  provider_id uuid not null references public.providers (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists contact_reveals_ip_idx on public.contact_reveals (ip_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- 触发器：updated_at、推荐数（只计 active）
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch on public.users;
create trigger users_touch before update on public.users for each row execute function public.touch_updated_at();
drop trigger if exists providers_touch on public.providers;
create trigger providers_touch before update on public.providers for each row execute function public.touch_updated_at();
drop trigger if exists recommendations_touch on public.recommendations;
create trigger recommendations_touch before update on public.recommendations for each row execute function public.touch_updated_at();

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
       set recommend_count = (select count(*) from public.recommendations r where r.provider_id = pid and r.status = 'active')
     where p.id = pid;
  end loop;
  return null;
end;
$$;

drop trigger if exists recommendations_count on public.recommendations;
create trigger recommendations_count
  after insert or update or delete on public.recommendations
  for each row execute function public.refresh_recommend_count();

-- ---------------------------------------------------------------------------
-- 站长审核通过商家：自动算创始名次（全站前 100，有效期 100 天）和分类名次
-- 只给 service role 调用
-- ---------------------------------------------------------------------------
create or replace function public.approve_provider(p_id uuid)
returns public.providers
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.providers;
  next_founding int;
  next_category int;
begin
  -- 串行化，避免两个审核同时拿到同一个名次
  perform pg_advisory_xact_lock(hashtext('approve_provider'));

  select * into p from public.providers where id = p_id for update;
  if not found then
    raise exception 'provider not found';
  end if;

  if p.approved_at is null then
    select coalesce(max(founding_rank), 0) + 1 into next_founding from public.providers;
    select coalesce(max(category_rank), 0) + 1 into next_category
      from public.providers where city_id = p.city_id and category = p.category;

    update public.providers set
      status = 'active',
      approved_at = now(),
      category_rank = next_category,
      is_founding = next_founding <= 100,
      founding_rank = case when next_founding <= 100 then next_founding end,
      founding_started_at = case when next_founding <= 100 then now() end,
      founding_expires_at = case when next_founding <= 100 then now() + interval '100 days' end
    where id = p_id
    returning * into p;
  else
    -- 曾经通过过（例如被隐藏后恢复）：不重新发名次
    update public.providers set status = 'active' where id = p_id returning * into p;
  end if;

  return p;
end;
$$;

revoke all on function public.approve_provider(uuid) from public, anon, authenticated;
grant execute on function public.approve_provider(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RLS 与列权限
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.providers enable row level security;
alter table public.recommendations enable row level security;
alter table public.ad_placements enable row level security;
alter table public.reports enable row level security;
alter table public.claim_requests enable row level security;
alter table public.city_waitlist enable row level security;
alter table public.contact_reveals enable row level security;

-- users：只能看自己
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users for select to authenticated using (id = auth.uid());

-- providers：匿名和登录用户只能读 active / paused 的公开字段
drop policy if exists providers_public_read on public.providers;
create policy providers_public_read on public.providers for select to anon, authenticated
  using (status in ('active', 'paused'));

-- 防爬（13.6）：phone、wechat_id、执照照片、提交人等不对前端开放
revoke select on public.providers from anon, authenticated;
grant select (
  id, city_id, source, name, category, sub_tags, service_areas, service_zips, has_wechat,
  languages, avatar_url, tagline, is_licensed, license_status, is_insured, emergency_24h,
  price_note, description, recommend_count, is_claimed, status, is_founding, founding_rank,
  founding_started_at, founding_expires_at, category_rank, approved_at, created_at, updated_at
) on public.providers to anon, authenticated;

-- recommendations：只读 active，不暴露 user_id
drop policy if exists recommendations_public_read on public.recommendations;
create policy recommendations_public_read on public.recommendations for select to anon, authenticated
  using (status = 'active');
revoke select on public.recommendations from anon, authenticated;
grant select (id, provider_id, recommender_area, service_item, cost_approx, comment, status, created_at, updated_at)
  on public.recommendations to anon, authenticated;

-- ad_placements：轮换记录可公开读
drop policy if exists ad_placements_public_read on public.ad_placements;
create policy ad_placements_public_read on public.ad_placements for select to anon, authenticated using (true);

-- 前端不能直接写任何表（所有写操作走服务端 service role）
revoke insert, update, delete on all tables in schema public from anon, authenticated;
-- reports / claim_requests / city_waitlist / contact_reveals 没有给 anon 的读策略 => 前端读不到

-- ---------------------------------------------------------------------------
-- Storage：头像公开、执照照片私有
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('licenses', 'licenses', false)
  on conflict (id) do nothing;
