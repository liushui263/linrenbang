# 邻人帮 Linren Bang

本地华人靠谱服务推荐网站：找师傅、经纪人、贷款、餐馆，先看邻居推荐，再打电话。
完整需求见 [`docs/邻人帮-开发规格.md`](docs/邻人帮-开发规格.md)（v3.2），站长要填的设置见 [`docs/邻人帮-站长设置与运营表单.md`](docs/邻人帮-站长设置与运营表单.md)。

技术栈：Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase（PostgreSQL + Auth + Storage），部署在 Vercel。

## 第一次上线（站长照做即可）

1. **Supabase**：新建项目 → SQL Editor 里**按编号顺序**整段运行 `supabase/migrations/` 下的每个文件（`0001_init.sql`、`0002_other_category.sql`、`0003_multi_category.sql`……）。以后有新的编号文件，要在部署新代码**之前**先运行。
   - **生产库不要跑** `supabase/seed.sql`（那是开发用的 555 假号码）。
2. **Google 登录**（v3 唯一的登录方式）：
   - Google Cloud Console → APIs & Services → Credentials → 新建 OAuth Client（Web），回调地址填 Supabase 给的 `https://<项目>.supabase.co/auth/v1/callback`。
   - Supabase → Authentication → Providers → Google，填 Client ID / Secret，打开。
   - Supabase → Authentication → URL Configuration：Site URL 填 `https://linrenbang.com`，Redirect URLs 加 `https://linrenbang.com/auth/callback` 和 `http://localhost:3000/auth/callback`。
   - 手机号（Phone）和微信登录**不用开**，网站上是灰的“暂不支持”。
3. **Vercel**：导入这个 GitHub 仓库，按 `.env.example` 填环境变量，部署。
4. **站长白名单**：用自己的 Google 账号在网站上登录一次 → Supabase → Authentication → Users 复制你的 User UID → 填到 Vercel 的 `ADMIN_USER_IDS` → 重新部署。之后“我的”页面会出现“站长审核后台”入口（`/admin`）。
5. **域名**：见下面“绑定域名 linrenbang.com”。
6. **上线自测**：打开 `https://linrenbang.com/api/health`，每一项都是 `ok` / `有`，再按下面“上线自测表”逐条过一遍，全部打勾后再发微信群。

## 绑定域名 linrenbang.com

1. Vercel → 项目 → Settings → Domains → Add，加 `linrenbang.com`，再加 `www.linrenbang.com`（Vercel 会问要不要把 www 跳转到主域名，选是）。
2. Vercel 会显示要加的 DNS 记录。**每个项目的值不一样，以你 Domains 页面上显示的为准。** 本项目当时显示的是：

   | 类型 | 主机名 (Name / Host) | 值 (Value / Points to) |
   | --- | --- | --- |
   | A | `@` | `216.198.79.1` |
   | CNAME | `www` | `810904bce80f744d.vercel-dns-017.com.` |

3. 到域名注册商（买域名的地方）的 DNS 管理页加上这两条，TTL 用默认值。
   - 如果那里已经有 `@` 的 A 记录或 `www` 的 CNAME（比如注册商的停放页），**先删掉旧的**，否则会冲突。
   - 有的注册商主机名不填 `@`，而是留空或填 `linrenbang.com`；CNAME 值末尾的点可加可不加。
4. 等生效：通常几分钟，最长 48 小时。Vercel Domains 页面两条都变成绿色 “Valid Configuration” 就好了。
   - 自己查：`nslookup linrenbang.com` 应该返回 `216.198.79.1`；`nslookup www.linrenbang.com` 应该指向上面的 vercel-dns 地址。
5. 验证 https：Vercel 会自动发证书（几分钟）。浏览器打开 `https://linrenbang.com`，地址栏是锁，不报“不安全”；`http://linrenbang.com` 和 `https://www.linrenbang.com` 都会自动跳到 `https://linrenbang.com`。
6. 域名生效后，确认 Vercel 环境变量 `NEXT_PUBLIC_SITE_URL=https://linrenbang.com`，Supabase → Authentication → URL Configuration 的 Site URL 和 Redirect URLs 也是这个域名（见上面第 2 步），然后在 Vercel 里 Redeploy 一次。

## 上线自测表（规格第 12 节）

在正式网站上逐条做，做完在“结果”栏打勾。“自动测试”一栏是代码里已有的单元测试（`npm test`），它们保证逻辑没被改坏，但**不代替线上真实点一遍**。

| # | 验收项 | 在 linrenbang.com 上怎么测 | 自动测试 | 结果 |
| --- | --- | --- | --- | --- |
| 0 | 配置正确 | 打开 `/api/health`，全部是 `ok` / `有` | — | ☐ |
| 1 | 首次打开问 Zip | 无痕窗口打开首页 → 输 77077 进休斯顿；再点“更改 Zip”输 10001 → 显示“还没开通”、能留邮箱、下面继续看休斯顿 | — | ☐ |
| 2 | 改 Zip 后城市跟着切 | 现在只开了休斯顿：改成任一休斯顿 Zip，列表、分类、今日推荐都正常；开第二个城市时再测一遍 | — | ☐ |
| 3 | 注册 → 审核 → 创始商家 → 到期 | 新 Google 账号注册商家 → 首页搜不到 → `/admin` 通过 → 首页能搜到，名片有“创始商家 #N · 还剩 100 天”；Supabase 里把它的 `founding_expires_at` 改成昨天 → 角标消失、不在“今日推荐”、仍在列表里按推荐数排 | `lib/founding-expiry.test.ts` | ☐ |
| 4 | 每日轮换 | 同一天刷新多次，“今日推荐”不变；第二天（中部时间 0 点后）再看会换；角标写“今日推荐” | `lib/rotation.test.ts` | ☐ |
| 5 | 分类网格 | 首页显示 6 个大类，“查看全部分类”里共 8 个（含“其他服务”）；点房产服务、餐饮美食、财税保险能筛出对应商家；搜索时能多选大类并删掉已选的 | — | ☐ |
| 6 | 其他服务 | 注册时选“其他服务”不填服务名会提示；填了以后名片和分享卡片显示服务名 | `lib/validate.test.ts` | ☐ |
| 7 | 名片一眼看清 | 手机上看名片：名字、分类、片区、推荐数、电话/微信按钮 | — | ☐ |
| 8 | 防重复 | 用已登记的电话再注册 → 电话下面提示已登记，并有“认领我的店”链接，点进去电话已填好；同一账号给同一商家推荐两次 → 被拦 | — | ☐ |
| 9 | 没有付费元素 | 全站翻一遍：没有星级、数据看板、付费置顶、Stripe、微信支付 | — | ☐ |
| 10 | 复制微信 / 拨号 / 短信 | 点“复制微信”有提示；点“一键拨号”手机直接弹出拨号；点“发短信”打开短信并预填“你好，我在邻人帮看到你的名片…” | `lib/phone.test.ts` | ☐ |
| 11 | 只开 Google 登录 | `/login` 只有 Google 能点；手机号、微信灰显“暂不支持”，点了没反应 | — | ☐ |
| 12 | 电话微信防爬 | 首页和详情页“查看网页源代码”搜商家电话号码 → 搜不到；点按钮后才出现 | — | ☐ |
| 13 | 暂停接单 | 商家在 `/merchant` 打开“暂停接单” → 名片按钮变灰，点不出电话微信 | — | ☐ |
| 14 | 微信分享卡片 | 把首页和一个商家页转发到微信（发给自己）→ 显示标题、描述、图片 | — | ☐ |
| 15 | 种子数据 | 生产库没跑 `seed.sql`；开发库里的电话全是 555 号段 | — | ☐ |
| 16 | 联系方式偏好 | 商家在 `/merchant` 只勾“发短信”、偏好选短信 → 名片只剩“发短信”按钮；再勾上电话、微信 → 发短信排第一并标“★ 偏好短信联系” | `lib/contact-pref.test.ts` | ☐ |

## 本地开发

```bash
cp .env.example .env.local   # 填上 Supabase 的三个 key
npm install
npm run dev                  # http://localhost:3000
npm test                     # 轮换算法、创始到期、电话格式、表单校验的单元测试
npm run lint && npm run typecheck
```

## 关键设计（对应规格章节）

| 功能 | 在哪 | 说明 |
| --- | --- | --- |
| 每日轮换（13.1） | `lib/rotation.ts`、`lib/providers.ts` | 按 America/Chicago 日期实时计算，**不用 Cron**；当天第一次访问时顺带写 `ad_placements`（Lazy Write） |
| 创始商家（第 6 节） | `approve_provider()` 数据库函数 | 站长点“通过”时自动发名次：全站前 100、有效期 100 天；分类名次同时算 |
| 微信分享卡片（13.2） | `app/layout.tsx`、`app/provider/[id]/page.tsx`、`public/og-default.png` | 首页统一卡片，商家页动态标题“邻居推荐：{商家名}（{分类}）” |
| 暂停接单（13.3） | `/merchant` 开关 | `paused` 商家留在列表里，按钮变灰，自动退出轮换 |
| 同片区推荐置顶（13.4） | `/provider/[id]` | 访客选的片区与推荐人片区一致时排最前，标“同片区邻居” |
| 双语免责声明（13.4） | `components/Footer.tsx` | 每页底部 |
| 只开 Google 登录（13.5） | `/login` | 手机号、微信按钮灰显“暂不支持” |
| 邻居求推荐 | `/ask`、`/ask/new`、`/ask/[id]`、`lib/asks.ts`、迁移 `0004_ask_board.sql` | 邻居发“求推荐”，回答 = 推荐一位具体师傅（已有的或新加的）。发帖/回答要 Google 登录；先发后管（举报 + 后台“最近 3 天的求推荐”隐藏）；勾“我自己找他做过”的回答另生成一条待审核推荐，通过后才算进推荐数；发帖人可关闭，已关闭的 30 天后从列表收起 |
| 推荐有回音 | `app/api/providers/[id]/event`、`components/RecommenderImpact.tsx`、`0006_recommender_impact.sql` | 详情页查看、一键拨号、复制微信各记一次（只存哈希，每人每天每种只算 1 次，商家本人和推荐人自己不算）；“我的”页面显示“你推荐的 XX，最近 7 天被 N 位邻居查看、M 位拨打”，可转发微信 |
| 联系方式偏好（13.8） | `components/ContactButtons.tsx`、`components/ProviderFields.tsx`、迁移 `0007_contact_pref.sql` | 商家选打电话 / 发短信 / 加微信（可多选）和最希望的一种；名片上偏好的排第一 |
| 电话微信防爬（13.6） | `app/api/providers/[id]/contact`、SQL 列权限 | 页面源码里没有电话和微信；前端 anon key 读不到这两列；点按钮才取，同一 IP 每小时最多 30 次 |
| 季节提醒 | `constants/seasonal.ts`（站长直接改）、`/season/[id]` | 按芝加哥月份自动上首页；每条有分享页、微信分享卡片图（`opengraph-image`）和可长按保存的竖版海报（`/season/{id}/poster.png`），图上只有师傅名字不含电话 |

**安全边界**：前端的 anon key 只能读公开数据，所有写操作都走服务端（Server Action + service role），服务端负责校验登录、归属和站长白名单。
