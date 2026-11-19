-- 邻人帮：邻居求推荐（/ask）
-- 邻居发“求推荐”，别的邻居回答 = 推荐一位具体的师傅（已有的，或新加的）。
-- 审核方式：提问和回答先发出去，有人举报或站长看着不对再隐藏（事后管理）。
-- 回答时勾了“我自己找他做过”的，会同时生成一条 recommendations（pending，站长通过后才算进邻居推荐数）。
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行）。部署新代码之前先运行。

-- ---------------------------------------------------------------------------
-- asks：求推荐
-- ---------------------------------------------------------------------------
create table if not exists public.asks (
  id uuid primary key default gen_random_uuid(),
  city_id varchar(20) not null default 'houston',
  user_id uuid not null references public.users (id) on delete cascade, -- 不对前端开放
  area varchar(40) not null,                 -- 片区（显示成“Katy 邻居”）
  category_group varchar(30) not null,       -- 首页 8 个大类之一
  category varchar(30),                      -- 选填：细分类
  title varchar(40) not null,
  details varchar(300),
  urgency varchar(10) not null default 'week' check (urgency in ('flexible', 'week', 'today')),
  status varchar(10) not null default 'open' check (status in ('open', 'closed', 'hidden')),
  answer_count int not null default 0,
  chosen_provider_id uuid references public.providers (id) on delete set null, -- 发帖人关闭时选的“最后找的是哪位”
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists asks_list_idx on public.asks (city_id, status, created_at desc);
create index if not exists asks_user_idx on public.asks (user_id, created_at desc);
create index if not exists asks_title_trgm on public.asks using gin (title gin_trgm_ops);

drop trigger if exists asks_touch on public.asks;
create trigger asks_touch before update on public.asks for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- ask_answers：回答 = 推荐一位师傅
-- ---------------------------------------------------------------------------
create table if not exists public.ask_answers (
  id uuid primary key default gen_random_uuid(),
  ask_id uuid not null references public.asks (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade, -- 不对前端开放
  recommender_area varchar(40) not null,
  comment varchar(300) not null,
  used_it boolean not null default false,    -- 勾了“我自己找他做过”
  recommendation_id uuid references public.recommendations (id) on delete set null,
  status varchar(10) not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  constraint ask_answers_one_per_provider unique (ask_id, user_id, provider_id)
);
create index if not exists ask_answers_ask_idx on public.ask_answers (ask_id, status, created_at);

-- 回答数（只计 active）
create or replace function public.refresh_ask_answer_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  for aid in
    select distinct x from unnest(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.ask_id end,
      case when tg_op in ('UPDATE', 'DELETE') then old.ask_id end
    ]) as x where x is not null
  loop
    update public.asks a
       set answer_count = (select count(*) from public.ask_answers r where r.ask_id = aid and r.status = 'active')
     where a.id = aid;
  end loop;
  return null;
end;
$$;

drop trigger if exists ask_answers_count on public.ask_answers;
create trigger ask_answers_count
  after insert or update or delete on public.ask_answers
  for each row execute function public.refresh_ask_answer_count();

-- ---------------------------------------------------------------------------
-- 举报：多两种对象
-- ---------------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('provider', 'recommendation', 'ask', 'ask_answer'));

-- ---------------------------------------------------------------------------
-- RLS 与列权限：公开读（不含 user_id），前端不能写
-- ---------------------------------------------------------------------------
alter table public.asks enable row level security;
alter table public.ask_answers enable row level security;

drop policy if exists asks_public_read on public.asks;
create policy asks_public_read on public.asks for select to anon, authenticated
  using (status in ('open', 'closed'));
revoke all on public.asks from anon, authenticated;
grant select (
  id, city_id, area, category_group, category, title, details, urgency, status, answer_count,
  chosen_provider_id, closed_at, created_at, updated_at
) on public.asks to anon, authenticated;

drop policy if exists ask_answers_public_read on public.ask_answers;
create policy ask_answers_public_read on public.ask_answers for select to anon, authenticated
  using (status = 'active');
revoke all on public.ask_answers from anon, authenticated;
grant select (id, ask_id, provider_id, recommender_area, comment, used_it, status, created_at)
  on public.ask_answers to anon, authenticated;
