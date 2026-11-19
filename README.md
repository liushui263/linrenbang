# 邻人帮 Linren Bang

本地华人靠谱服务推荐网站：找师傅、经纪人、贷款、餐馆，先看邻居推荐，再打电话。
完整需求见 [`docs/邻人帮-开发规格.md`](docs/邻人帮-开发规格.md)（v3.2），站长要填的设置见 [`docs/邻人帮-站长设置与运营表单.md`](docs/邻人帮-站长设置与运营表单.md)。

技术栈：Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase（PostgreSQL + Auth + Storage），部署在 Vercel。

## 第一次上线（站长照做即可）

1. **Supabase**：新建项目 → SQL Editor 里**按编号顺序**整段运行 `supabase/migrations/` 下的每个文件（`0001_init.sql`、`0002_other_category.sql`……）。以后有新的编号文件，要在部署新代码**之前**先运行。
   - **生产库不要跑** `supabase/seed.sql`（那是开发用的 555 假号码）。
2. **Google 登录**（v3 唯一的登录方式）：
   - Google Cloud Console → APIs & Services → Credentials → 新建 OAuth Client（Web），回调地址填 Supabase 给的 `https://<项目>.supabase.co/auth/v1/callback`。
   - Supabase → Authentication → Providers → Google，填 Client ID / Secret，打开。
   - Supabase → Authentication → URL Configuration：Site URL 填 `https://linrenbang.com`，Redirect URLs 加 `https://linrenbang.com/auth/callback` 和 `http://localhost:3000/auth/callback`。
   - 手机号（Phone）和微信登录**不用开**，网站上是灰的“暂不支持”。
3. **Vercel**：导入这个 GitHub 仓库，按 `.env.example` 填环境变量，部署。
4. **站长白名单**：用自己的 Google 账号在网站上登录一次 → Supabase → Authentication → Users 复制你的 User UID → 填到 Vercel 的 `ADMIN_USER_IDS` → 重新部署。之后“我的”页面会出现“站长审核后台”入口（`/admin`）。
5. **域名**：Vercel → Settings → Domains 加 `linrenbang.com`，按提示去域名商那里加 DNS 记录。

## 本地开发

```bash
cp .env.example .env.local   # 填上 Supabase 的三个 key
npm install
npm run dev                  # http://localhost:3000
npm test                     # 轮换算法、电话格式的单元测试
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
| 电话微信防爬（13.6） | `app/api/providers/[id]/contact`、SQL 列权限 | 页面源码里没有电话和微信；前端 anon key 读不到这两列；点按钮才取，同一 IP 每小时最多 30 次 |

**安全边界**：前端的 anon key 只能读公开数据，所有写操作都走服务端（Server Action + service role），服务端负责校验登录、归属和站长白名单。
