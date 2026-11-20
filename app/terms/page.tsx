import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Ul } from "@/components/LegalPage";
import { DISCLAIMER_EN, DISCLAIMER_ZH, SITE_NAME, SITE_NAME_EN } from "@/constants/site";

export const metadata: Metadata = {
  title: "服务条款 Terms of Service",
  description: `使用 ${SITE_NAME} ${SITE_NAME_EN} 的规则和免责声明。`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      titleZh="服务条款"
      titleEn="Terms of Service"
      zh={[
        {
          title: "接受条款",
          body: (
            <p>
              使用邻人帮（Linren Bang，linrenbang.com）即表示你同意本条款和我们的
              <Link href="/privacy" className="text-emerald-700 underline">隐私政策</Link>。不同意的话请不要使用本网站。
            </p>
          ),
        },
        {
          title: "网站是什么",
          body: (
            <>
              <p>邻人帮是一个免费的邻里信息分享平台：邻居推荐自己用过的本地服务商家，商家可以免费展示名片。我们不提供任何服务，不参与交易，不收取佣金。</p>
              <p className="font-medium text-gray-900">{DISCLAIMER_ZH}</p>
            </>
          ),
        },
        {
          title: "你发布的内容",
          body: (
            <>
              <p>你对自己发布的推荐、帖子、商家资料和照片负责。请只发布真实、亲身经历的内容。不允许：</p>
              <Ul
                items={[
                  "虚假推荐、给自己或熟人刷好评、收钱写推荐；",
                  "冒用他人身份，或未经同意发布他人的私人信息；",
                  "辱骂、歧视、骚扰、违法或侵犯他人权利的内容；",
                  "垃圾广告，或用爬虫、脚本批量抓取商家联系方式。",
                ]}
              />
              <p>
                你发布内容即授权邻人帮在网站上（以及分享卡片、海报中）免费展示这些内容。你保留内容的所有权，可以随时要求删除。
              </p>
            </>
          ),
        },
        {
          title: "商家",
          body: (
            <p>
              商家须保证所填信息（包括执照、保险状态）真实准确。“有执照 / 有保险”等标记来自商家自述，即使上传了执照照片，我们也只做基本查看，不代表已向州政府核实。发现自己的信息被邻居推荐上来，可以认领、修改、暂停展示或申请下架。
            </p>
          ),
        },
        {
          title: "审核与下架",
          body: (
            <p>
              我们可以审核、隐藏或删除任何违反本条款或我们认为不合适的内容或名片，也可以停用违规账号，不一定事先通知。看到问题内容，请使用页面上的“举报”按钮。
            </p>
          ),
        },
        {
          title: "免责与责任限制",
          body: (
            <p>
              网站按“现状”提供，不保证信息完整、准确或随时可用。你和商家之间的报价、施工、付款、售后等一切往来由双方自行负责。在法律允许的最大范围内，邻人帮及其运营者不对因使用本网站或任何商家服务产生的损失承担责任。
            </p>
          ),
        },
        {
          title: "其他",
          body: (
            <p>
              本条款适用美国德克萨斯州法律。条款更新时我们会修改本页的生效日期；更新后继续使用即视为接受。中英文版本如有出入，以英文版本为准。
            </p>
          ),
        },
      ]}
      en={[
        {
          title: "Acceptance",
          body: (
            <p>
              By using Linren Bang (邻人帮, linrenbang.com) you agree to these Terms and to our{" "}
              <Link href="/privacy" className="text-emerald-700 underline">Privacy Policy</Link>. If you do not agree, please do not use the site.
            </p>
          ),
        },
        {
          title: "What the site is",
          body: (
            <>
              <p>
                Linren Bang is a free community directory: neighbors recommend local service providers they have used, and providers can list themselves for free. We do not provide any services, are not a party to any transaction, and take no commission.
              </p>
              <p className="font-medium text-gray-900">{DISCLAIMER_EN}</p>
            </>
          ),
        },
        {
          title: "Your content",
          body: (
            <>
              <p>You are responsible for the recommendations, posts, listing details and photos you submit. Post only honest, first-hand content. You may not:</p>
              <Ul
                items={[
                  "post fake reviews, review yourself or people you are affiliated with, or accept payment for recommendations;",
                  "impersonate anyone, or post someone else’s private information without consent;",
                  "post abusive, discriminatory, harassing or unlawful content, or content that infringes others’ rights;",
                  "spam, or scrape provider contact details with bots or scripts.",
                ]}
              />
              <p>
                By posting, you give Linren Bang a free license to display your content on the site, including in share cards and posters. You keep ownership and may ask us to remove it at any time.
              </p>
            </>
          ),
        },
        {
          title: "Providers",
          body: (
            <p>
              Providers must keep their listing accurate, including license and insurance status. “Licensed” and “Insured” labels are self-reported. Even when a license photo is uploaded, we only glance at it and do not verify it with any state agency. A provider listed by a neighbor may claim, edit, pause or request removal of the listing.
            </p>
          ),
        },
        {
          title: "Moderation",
          body: (
            <p>
              We may review, hide or remove any content or listing that breaks these Terms or that we find inappropriate, and may suspend accounts, with or without notice. Please use the “Report” button to flag a problem.
            </p>
          ),
        },
        {
          title: "Disclaimer and limitation of liability",
          body: (
            <p>
              The site is provided “as is”, without warranties of any kind, including accuracy, completeness or availability. Quotes, work, payment and any disputes are solely between you and the provider. To the fullest extent permitted by law, Linren Bang and its operator are not liable for any loss or damage arising from your use of the site or of any provider’s services.
            </p>
          ),
        },
        {
          title: "General",
          body: (
            <p>
              These Terms are governed by the laws of the State of Texas, USA. We may update them and will change the effective date above; continued use means you accept the updated Terms. If the Chinese and English versions differ, the English version controls.
            </p>
          ),
        },
      ]}
    />
  );
}
