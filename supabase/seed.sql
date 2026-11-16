-- 开发环境种子数据（生产环境不要跑！）
-- 12 家商家覆盖 12 个分类，电话全部是 +171355501XX 虚构号段；4 条推荐；2 条轮换示例。
-- 跑之前先按顺序跑 migrations/ 里的所有 SQL（0001、0002……）。

-- 一个演示用户，用来挂推荐（只能在开发库这样建）
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', 'demo-neighbor@example.com', '', now(), now(), now(), '{"provider":"google"}', '{"full_name":"演示邻居"}'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'demo-neighbor2@example.com', '', now(), now(), now(), '{"provider":"google"}', '{"full_name":"演示邻居二"}')
on conflict (id) do nothing;

insert into public.providers
  (id, city_id, source, name, category, sub_tags, service_areas, phone, wechat_id, languages, tagline, is_licensed, emergency_24h, price_note, description, status,
   is_founding, founding_rank, founding_started_at, founding_expires_at, category_rank, approved_at)
values
  ('10000000-0000-0000-0000-000000000001', 'houston', 'seed', '老王空调（演示）', 'hvac', '{中央空调,换压缩机,加冷媒}', '{Katy,"Sugar Land"}', '+17135550101', 'demo_laowang', '{国语}', '15 年中央空调，Katy 很多家都是我装的', true, true, '上门检查 $80，修好免检查费', '演示数据：主做中央空调维修和更换。', 'active', true, 1, now() - interval '10 days', now() + interval '90 days', 1, now() - interval '10 days'),
  ('10000000-0000-0000-0000-000000000002', 'houston', 'seed', '李师傅水管（演示）', 'plumbing', '{换热水器,通下水道,漏水抢修}', '{Chinatown,"Inner Loop"}', '+17135550102', 'demo_lishifu', '{国语,粤语}', '热水器当天换，下水道不通不收钱', false, true, null, '演示数据：水管、热水器、马桶。', 'active', true, 2, now() - interval '9 days', now() + interval '91 days', 1, now() - interval '9 days'),
  ('10000000-0000-0000-0000-000000000003', 'houston', 'seed', '小陈电工（演示）', 'electrical', '{装灯,换电箱,充电桩}', '{Katy,Cypress}', '+17135550103', null, '{国语}', '特斯拉充电桩安装', true, false, null, '演示数据：家庭电路。', 'active', true, 3, now() - interval '8 days', now() + interval '92 days', 1, now() - interval '8 days'),
  ('10000000-0000-0000-0000-000000000004', 'houston', 'seed', '张记屋顶（演示）', 'roof', '{补漏,换屋顶,保险理赔}', '{Pearland,"Clear Lake"}', '+17135550104', 'demo_zhangroof', '{国语,English}', '冰雹后保险理赔一条龙', false, false, '免费上门估价', '演示数据：屋顶维修。', 'active', true, 4, now() - interval '7 days', now() + interval '93 days', 1, now() - interval '7 days'),
  ('10000000-0000-0000-0000-000000000005', 'houston', 'seed', '安心除虫（演示）', 'pest', '{白蚁,蟑螂,老鼠}', '{"Sugar Land",Woodlands}', '+17135550105', null, '{国语}', null, false, false, null, '演示数据：除白蚁、蟑螂、老鼠。', 'active', false, null, null, null, 1, now() - interval '6 days'),
  ('10000000-0000-0000-0000-000000000006', 'houston', 'seed', '绿园庭院（演示）', 'lawn_fence', '{剪草,修围栏,种树}', '{Katy}', '+17135550106', 'demo_lvyuan', '{国语}', '每周剪草包月', false, false, '包月 $120 起', '演示数据：庭院维护。', 'active', true, 5, now() - interval '6 days', now() + interval '94 days', 1, now() - interval '6 days'),
  ('10000000-0000-0000-0000-000000000007', 'houston', 'seed', '刘师傅家电（演示）', 'appliance', '{修冰箱,修洗衣机,车库门}', '{Cypress,Katy}', '+17135550107', null, '{国语}', null, false, false, null, '演示数据：家电维修。', 'paused', true, 6, now() - interval '5 days', now() + interval '95 days', 1, now() - interval '5 days'),
  ('10000000-0000-0000-0000-000000000008', 'houston', 'seed', '巧手装修（演示）', 'handyman', '{刷墙,换地板,装橱柜}', '{"Sugar Land"}', '+17135550108', 'demo_qiaoshou', '{国语}', '小活也接', false, false, null, '演示数据：室内装修杂活。', 'active', false, null, null, null, 1, now() - interval '4 days'),
  ('10000000-0000-0000-0000-000000000009', 'houston', 'seed', '顺风搬家（演示）', 'moving_ride', '{搬家,机场接送}', '{Chinatown,Katy,"Sugar Land"}', '+17135550109', null, '{国语,粤语}', null, false, false, '机场接送 $50 起', '演示数据：搬家和机场接送。', 'active', true, 7, now() - interval '3 days', now() + interval '97 days', 1, now() - interval '3 days'),
  ('10000000-0000-0000-0000-000000000010', 'houston', 'seed', '周经纪（演示）', 'realtor', '{买房,卖房,租房}', '{Katy,Cypress}', '+17135550110', 'demo_zhou', '{国语,English}', null, true, false, null, '演示数据：房产经纪人，不接 MLS 房源。', 'active', true, 8, now() - interval '2 days', now() + interval '98 days', 1, now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000011', 'houston', 'seed', '吴贷款 Title（演示）', 'mortgage_title', '{首次购房贷款,再融资,Title 过户}', '{"Sugar Land",Pearland}', '+17135550111', null, '{国语}', null, true, false, null, '演示数据：贷款员，不报实时利率。', 'active', false, null, null, null, 1, now() - interval '1 days'),
  ('10000000-0000-0000-0000-000000000012', 'houston', 'seed', '老北京面馆（演示）', 'food', '{炸酱面,饺子}', '{Chinatown}', '+17135550112', null, '{国语}', '正宗炸酱面', false, false, null, '演示数据：餐馆推荐，不做在线订餐。', 'active', true, 9, now() - interval '1 days', now() + interval '99 days', 1, now() - interval '1 days'),
  -- 再加一家空调，演示同分类轮换池 > 2 时的轮换
  ('10000000-0000-0000-0000-000000000013', 'houston', 'seed', '赵记冷暖（演示）', 'hvac', '{暖气炉,风管清洗}', '{Katy}', '+17135550113', null, '{国语}', null, false, false, null, '演示数据。', 'active', true, 10, now() - interval '1 days', now() + interval '99 days', 2, now() - interval '1 days'),
  ('10000000-0000-0000-0000-000000000014', 'houston', 'seed', '钱师傅空调（演示）', 'hvac', '{窗机,分体机}', '{"Sugar Land"}', '+17135550114', 'demo_qian', '{国语}', null, false, false, null, '演示数据。', 'active', true, 11, now(), now() + interval '100 days', 3, now())
on conflict (id) do nothing;

-- “其他服务”示例（v3.3）
insert into public.providers (id, city_id, source, name, category, custom_service, sub_tags, service_areas, phone, languages, tagline, description, status, category_rank, approved_at)
values ('10000000-0000-0000-0000-000000000015', 'houston', 'seed', '小林建站（演示）', 'other', '网站设计', '{小店网站,微信小程序}', '{Katy,"Sugar Land"}', '+17135550115', '{国语,English}', '帮小商家做网站', '演示数据：“其他服务”分类示例。', 'active', 1, now())
on conflict (id) do nothing;

insert into public.recommendations (provider_id, user_id, recommender_area, service_item, cost_approx, comment, status)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'Katy', '换压缩机', '$1,800', '7 月最热的时候坏了，打电话当天下午就来了，价格比两家美国公司便宜一半。', 'active'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d2', 'Sugar Land', '加冷媒', '$150', '人很实在，没问题的地方不让你换。', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', 'Chinatown', '换热水器', '$1,200', '早上打电话中午就换好了，旧的也帮忙拉走。', 'active'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000d2', 'Chinatown', null, '人均 $15', '炸酱面很地道，周末要排队。', 'active')
on conflict do nothing;

-- 轮换示例（正常情况下由网站在当天第一次访问时自动写入）
insert into public.ad_placements (provider_id, city_id, slot_type, category, rotation_date, start_at, end_at)
values
  ('10000000-0000-0000-0000-000000000001', 'houston', 'home_rotation', null, (now() at time zone 'America/Chicago')::date - 1, now() - interval '1 day', now() - interval '1 second'),
  ('10000000-0000-0000-0000-000000000002', 'houston', 'home_rotation', null, (now() at time zone 'America/Chicago')::date - 1, now() - interval '1 day', now() - interval '1 second')
on conflict do nothing;
