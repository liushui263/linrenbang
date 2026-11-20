import type { Metadata } from "next";
import LegalPage, { Ul } from "@/components/LegalPage";
import { SITE_NAME, SITE_NAME_EN } from "@/constants/site";

export const metadata: Metadata = {
  title: "隐私政策 Privacy Policy",
  description: `${SITE_NAME} ${SITE_NAME_EN} 收集哪些信息、怎么用、怎么删除。`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      titleZh="隐私政策"
      titleEn="Privacy Policy"
      zh={[
        {
          title: "我们是谁",
          body: (
            <p>
              邻人帮（Linren Bang，linrenbang.com）是一个由个人运营的本地华人邻里服务推荐网站。本政策说明我们收集哪些信息、怎么使用、和谁共享，以及你怎么查看或删除。我们只收集网站运行真正需要的信息，不卖任何个人信息，也不放广告追踪。
            </p>
          ),
        },
        {
          title: "用 Google 登录时",
          body: (
            <>
              <p>
                你用 Google 账号登录时，Google 会提供你的姓名、邮箱和头像。我们只保存邮箱和显示名称，用来识别你的账号、显示在“我的”页面。头像不保存。我们只请求基本资料权限（openid、email、profile），不读取你的 Gmail、通讯录、云盘或任何其他 Google 数据。
              </p>
              <p>
                从 Google 获得的信息只用于登录和账号管理，不会转让或出售给任何人，也不用于广告。我们对 Google 用户数据的使用遵守 Google API Services User Data Policy，包括其中的 Limited Use 要求。
              </p>
            </>
          ),
        },
        {
          title: "你主动提供的信息",
          body: (
            <Ul
              items={[
                "所在 Zip Code 和片区：用来显示你附近的商家，以及在推荐里显示“某某片区邻居”。保存在你浏览器的 Cookie 里。",
                "推荐与求推荐：你写的推荐内容、服务项目、大致花费、片区，以及你发的求推荐帖子和回答。这些内容会公开显示，但只显示片区（如“Katy 邻居”），不显示你的姓名或邮箱。",
                "收藏：你收藏的商家，只有你自己看得到。",
                "举报、下架申请、认领店铺：你填写的原因和联系方式（如微信号），只有站长能看到，用来核实处理。",
                "新城市候补名单：你留下的邮箱和 Zip Code，只用于该城市开通时通知你。",
              ]}
            />
          ),
        },
        {
          title: "商家名片信息",
          body: (
            <>
              <p>
                商家注册或邻居推荐商家时，会提交店名、服务类别、服务片区、电话、微信号、偏好的联系方式、语言、简介、价格说明、头像或店铺照片，以及（可选）执照号码和执照照片。
              </p>
              <Ul
                items={[
                  "店名、类别、简介、头像等名片内容会公开显示。",
                  "电话和微信号不直接写在网页源码里，访客点“打电话 / 复制微信”时才取出，用来防止爬虫批量抓取。",
                  "执照照片存放在私有存储里，只有站长审核时能看到，不会公开。",
                  "如果你是商家、发现自己的信息被邻居推荐上来但不希望展示，可以认领后自己修改、暂停展示，或申请下架。",
                ]}
              />
            </>
          ),
        },
        {
          title: "自动记录的信息",
          body: (
            <Ul
              items={[
                "取联系方式记录：访客点开某个商家的电话或微信时，我们记录商家编号、时间和一个加盐哈希后的 IP 值，用来限制频率、防止爬虫。我们不保存原始 IP。",
                "浏览与点击统计：为了让推荐人和商家看到“多少邻居看过 / 联系过”，我们按天记录商家名片被浏览、拨号、复制微信的次数。识别重复访问用的是加盐哈希值（登录用户按账号，未登录按 IP 和浏览器信息），不保存原始 IP，也不对外显示是谁看的。",
                "Cookie：只有登录状态 Cookie 和保存你 Zip Code / 片区的 Cookie。没有广告或第三方分析 Cookie。",
                "服务器日志：托管商 Vercel 会像所有网站一样记录访问日志（可能包括 IP 和浏览器类型），用于安全和排错，按其政策短期保存。",
              ]}
            />
          ),
        },
        {
          title: "和谁共享",
          body: (
            <>
              <p>我们不出售、不出租个人信息。只有以下服务商会按我们的指示代为处理数据：</p>
              <Ul
                items={[
                  "Supabase：数据库、登录和图片存储。",
                  "Vercel：网站托管。",
                  "Google：提供“用 Google 登录”。",
                ]}
              />
              <p>除非法律要求（如法院传票），我们不会向其他任何人提供你的信息。</p>
            </>
          ),
        },
        {
          title: "保存多久、怎么删除",
          body: (
            <p>
              账号信息、推荐、帖子和收藏会一直保存，直到你要求删除。你可以随时发邮件给我们，要求查看、更正或删除你的账号和相关内容，我们会在 30 天内处理。删除账号后，你的推荐、帖子和收藏会一并删除；如果你名下有商家名片，请在邮件里说明是否一起下架。统计用的哈希记录不含可识别个人的信息。
            </p>
          ),
        },
        {
          title: "安全与儿童",
          body: (
            <p>
              数据通过 HTTPS 传输，存放在有访问权限控制的数据库里。但没有任何网站能保证百分之百安全。本网站面向成年人，不面向 13 岁以下儿童，也不会有意收集儿童的信息。
            </p>
          ),
        },
        {
          title: "政策更新",
          body: <p>如果本政策有重要变更，我们会更新本页顶部的生效日期，必要时在网站上提示。</p>,
        },
      ]}
      en={[
        {
          title: "Who we are",
          body: (
            <p>
              Linren Bang (邻人帮, linrenbang.com) is an independently run community directory where Chinese-speaking neighbors share recommendations for local service providers. This policy explains what we collect, how we use it, who we share it with, and how you can access or delete it. We collect only what the site needs to work. We do not sell personal information and we do not run ad tracking.
            </p>
          ),
        },
        {
          title: "Signing in with Google",
          body: (
            <>
              <p>
                When you sign in with Google, Google shares your name, email address and profile picture with us. We store only your email address and display name, to identify your account and show it on your “My” page. We do not store your profile picture. We request only the basic scopes (openid, email, profile) and never access your Gmail, contacts, Drive or any other Google data.
              </p>
              <p>
                Information received from Google is used only for sign-in and account management. It is never sold, transferred to others, or used for advertising. Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.
              </p>
            </>
          ),
        },
        {
          title: "Information you provide",
          body: (
            <Ul
              items={[
                "Zip code and neighborhood: used to show nearby providers and to label your recommendations (e.g. “Katy neighbor”). Stored in a cookie in your browser.",
                "Recommendations and requests: the text, service, approximate cost and neighborhood you submit, plus requests you post and answers you give. These are shown publicly, labeled only by neighborhood, never by your name or email.",
                "Favorites: providers you save. Visible only to you.",
                "Reports, takedown requests and listing claims: the reason and contact details (such as a WeChat ID) you enter. Seen only by the site administrator, to verify and act on them.",
                "City waitlist: your email and zip code, used only to tell you when your city opens.",
              ]}
            />
          ),
        },
        {
          title: "Provider listing information",
          body: (
            <>
              <p>
                When a provider registers, or a neighbor recommends one, we collect the business name, categories, service areas, phone number, WeChat ID, preferred contact method, languages, description, pricing note, avatar or photo, and optionally a license number and license photo.
              </p>
              <Ul
                items={[
                  "The business name, categories, description and avatar are shown publicly.",
                  "Phone numbers and WeChat IDs are not written into the page source. They are fetched only when a visitor taps “Call” or “Copy WeChat”, to deter scraping.",
                  "License photos are kept in private storage, seen only by the administrator during review, and never published.",
                  "Providers listed by a neighbor can claim the listing to edit it, pause it, or ask us to remove it.",
                ]}
              />
            </>
          ),
        },
        {
          title: "Information collected automatically",
          body: (
            <Ul
              items={[
                "Contact reveal log: when a visitor reveals a provider’s phone or WeChat, we log the provider, the time and a salted hash of the IP address, to rate-limit and stop scrapers. We do not store the raw IP address.",
                "View and tap counts: so recommenders and providers can see how many neighbors viewed or contacted a listing, we count daily views, calls and WeChat copies. Repeat visits are de-duplicated with a salted hash (of the account ID when signed in, or of IP and browser details when not). Raw IP addresses are not stored, and who viewed a listing is never shown.",
                "Cookies: only the sign-in session cookie and the cookies that remember your zip code and neighborhood. No advertising or third-party analytics cookies.",
                "Server logs: our host, Vercel, keeps standard access logs (which may include IP address and browser type) for security and debugging, retained briefly under its own policy.",
              ]}
            />
          ),
        },
        {
          title: "Who we share it with",
          body: (
            <>
              <p>We do not sell or rent personal information. Only these service providers process data on our behalf:</p>
              <Ul items={["Supabase: database, authentication and image storage.", "Vercel: website hosting.", "Google: “Sign in with Google”."]} />
              <p>We will not disclose your information to anyone else unless required by law (for example, a subpoena).</p>
            </>
          ),
        },
        {
          title: "Retention and deletion",
          body: (
            <p>
              Account data, recommendations, posts and favorites are kept until you ask us to delete them. You can email us at any time to access, correct or delete your account and content, and we will respond within 30 days. Deleting your account also deletes your recommendations, posts and favorites; if you own a provider listing, tell us whether to remove it too. The hashed statistics records contain no personally identifying information.
            </p>
          ),
        },
        {
          title: "Security and children",
          body: (
            <p>
              Data is sent over HTTPS and stored in an access-controlled database, but no website can guarantee perfect security. The site is meant for adults and is not directed at children under 13. We do not knowingly collect information from children.
            </p>
          ),
        },
        {
          title: "Changes",
          body: <p>If we make material changes, we will update the effective date at the top of this page and, where appropriate, post a notice on the site.</p>,
        },
      ]}
    />
  );
}
