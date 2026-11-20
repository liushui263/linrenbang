-- 邻人帮：商家最多可选 3 个分类
-- 新增 providers.categories（1-3 个细分类 id，第一个是“主营分类”）。
-- 原来的 providers.category 保留，永远等于 categories 的第一个（主营），
-- 用于创始轮换池、category_rank、ad_placements 等“按一个分类算”的地方。
-- 现有商家：categories 自动回填为 [原 category]，数据不丢。
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行）。部署新代码之前先运行。

alter table public.providers add column if not exists categories varchar(30)[] not null default '{}';

-- 回填现有数据
update public.providers set categories = array[category] where cardinality(categories) = 0;

-- 去重并保持顺序（给 trigger 用）
create or replace function public.dedupe_text_array(arr varchar(30)[])
returns varchar(30)[]
language sql
immutable
as $$
  select coalesce(array_agg(x order by first_pos), '{}')
  from (
    select x, min(pos) as first_pos
    from unnest(arr) with ordinality as t(x, pos)
    where x is not null and length(trim(x)) > 0
    group by x
  ) s;
$$;

-- 写入时自动同步：只传 category（旧代码）→ categories = [category]；
-- 传了 categories → 去重、主营 category = categories[1]
create or replace function public.providers_sync_categories()
returns trigger
language plpgsql
as $$
begin
  new.categories := public.dedupe_text_array(new.categories);
  if cardinality(new.categories) = 0 then
    new.categories := array[new.category];
  elsif tg_op = 'UPDATE'
        and new.category is distinct from old.category
        and new.categories = old.categories then
    -- 旧代码只改了 category：把它换成新的主营，其余保留（超过 3 个时去掉最后的）
    new.categories := (public.dedupe_text_array(array[new.category] || new.categories))[1:3];
  end if;
  new.category := new.categories[1];
  return new;
end;
$$;

drop trigger if exists providers_sync_categories on public.providers;
create trigger providers_sync_categories
  before insert or update of category, categories on public.providers
  for each row execute function public.providers_sync_categories();

alter table public.providers drop constraint if exists providers_categories_count;
alter table public.providers add constraint providers_categories_count
  check (cardinality(categories) between 1 and 3 and categories[1] = category);

-- “其他服务”不管是第几个分类，都要有服务名
alter table public.providers drop constraint if exists providers_other_needs_name;
alter table public.providers add constraint providers_other_needs_name
  check (not ('other' = any(categories)) or length(trim(coalesce(custom_service, ''))) >= 2);

-- 按分类浏览 / 搜索用（categories @> '{hvac}'、categories && '{...}'）
create index if not exists providers_categories_gin on public.providers using gin (categories);

-- 新列要单独开放给前端读（0001 里用的是列级权限）
grant select (categories) on public.providers to anon, authenticated;
