-- 邻人帮 v3.3：新增“其他服务”分类（category = 'other'）
-- 选“其他服务”的商家必须填一个简短服务名（如“网站设计”），名片上显示这个名字。
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行）。

alter table public.providers add column if not exists custom_service varchar(12);

alter table public.providers drop constraint if exists providers_other_needs_name;
alter table public.providers add constraint providers_other_needs_name
  check (category <> 'other' or length(trim(coalesce(custom_service, ''))) >= 2);

create index if not exists providers_custom_service_trgm on public.providers using gin (custom_service gin_trgm_ops);

-- 新列要单独开放给前端读（0001 里用的是列级权限）
grant select (custom_service) on public.providers to anon, authenticated;
