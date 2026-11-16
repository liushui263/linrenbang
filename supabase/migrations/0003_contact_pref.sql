-- 邻人帮 v3.4：联系方式偏好
-- 商家可选顾客怎么联系自己：打电话 / 发短信 / 加微信（可多选），并指定一个“最希望”的方式。
-- 名片上偏好的按钮排第一、高亮，并标“偏好短信联系”之类。
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行）。**先运行本文件，再合并/部署新代码。**

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'providers' and column_name = 'contact_methods'
  ) then
    alter table public.providers
      add column contact_methods text[] not null default '{phone,sms}',
      add column contact_pref varchar(10) not null default 'phone';
    -- 老数据：有微信号的把微信也加上（只在第一次运行时做，重复运行不会覆盖商家自己的选择）
    update public.providers
    set contact_methods = array['phone', 'sms', 'wechat']
    where wechat_id is not null and length(trim(wechat_id)) > 0;
  end if;
end $$;

alter table public.providers drop constraint if exists providers_contact_methods_valid;
alter table public.providers add constraint providers_contact_methods_valid check (
  cardinality(contact_methods) >= 1
  and contact_methods <@ array['phone', 'sms', 'wechat']::text[]
  and contact_pref = any (contact_methods)
  and (not ('wechat' = any (contact_methods)) or (wechat_id is not null and length(trim(wechat_id)) > 0))
);

-- 新列要单独开放给前端读（0001 里用的是列级权限）
grant select (contact_methods, contact_pref) on public.providers to anon, authenticated;
