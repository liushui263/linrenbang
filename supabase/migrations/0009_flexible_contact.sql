-- 邻人帮：匿名推荐的“联系方式”放宽
-- 推荐时不一定有电话：可以填微信号、邮箱、网址，或者上传一张图（名片、广告截图、二维码），能找到商家就行。
-- - providers.phone 可以为空（有电话时仍然全站唯一，用来查重）
-- - contact_note：推荐人填的联系方式原文（微信 / 邮箱 / 网址等，200 字内）；匿名不可读
-- - contact_image_url：联系方式图片（压缩过的名片 / 广告截图 / 二维码）；匿名不可读
-- - has_contact_extra：有没有上面两项，前端据此显示“查看联系方式”按钮
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行）。先运行 0008，再运行本文件，然后再合并/部署新代码。

alter table public.providers alter column phone drop not null;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'providers' and column_name = 'contact_note'
  ) then
    alter table public.providers
      add column contact_note varchar(200),
      add column contact_image_url text;
    alter table public.providers
      add column has_contact_extra boolean generated always as (
        (contact_note is not null and length(trim(contact_note)) > 0) or contact_image_url is not null
      ) stored;
  end if;
end $$;

-- 联系方式规则：没有电话的商家可以一个按钮都没有（只靠“查看联系方式”）；打电话 / 发短信要有电话
alter table public.providers drop constraint if exists providers_contact_methods_valid;
alter table public.providers add constraint providers_contact_methods_valid check (
  contact_methods <@ array['phone', 'sms', 'wechat']::text[]
  and (cardinality(contact_methods) = 0 or contact_pref = any (contact_methods))
  and (cardinality(contact_methods) >= 1 or phone is null)
  and (phone is not null or not (contact_methods && array['phone', 'sms']::text[]))
  and (not ('wechat' = any (contact_methods)) or (wechat_id is not null and length(trim(wechat_id)) > 0))
);

-- 至少要有一种能找到商家的方式
alter table public.providers drop constraint if exists providers_reachable;
alter table public.providers add constraint providers_reachable check (
  phone is not null
  or (wechat_id is not null and length(trim(wechat_id)) > 0)
  or (contact_note is not null and length(trim(contact_note)) > 0)
  or contact_image_url is not null
);

grant select (has_contact_extra) on public.providers to anon, authenticated;
