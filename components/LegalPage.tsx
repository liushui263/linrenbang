import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE } from "@/constants/site";

export type LegalSection = { title: string; body: React.ReactNode };

/** 隐私政策 / 服务条款的通用排版：中文在前，英文在后 */
export default function LegalPage({
  titleZh,
  titleEn,
  zh,
  en,
}: {
  titleZh: string;
  titleEn: string;
  zh: LegalSection[];
  en: LegalSection[];
}) {
  const mail = (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 underline">
      {CONTACT_EMAIL}
    </a>
  );
  return (
    <article className="space-y-8 py-6 text-sm leading-relaxed text-gray-700">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900">
          {titleZh} <span className="text-base font-medium text-gray-500">{titleEn}</span>
        </h1>
        <p className="text-xs text-gray-500">
          生效日期 Effective date：{LEGAL_EFFECTIVE_DATE} · <a href="#english">English version below</a>
        </p>
      </header>

      <section className="space-y-4 rounded-2xl bg-white p-4" lang="zh-CN">
        {zh.map((s) => (
          <div key={s.title} className="space-y-1">
            <h2 className="font-semibold text-gray-900">{s.title}</h2>
            <div className="space-y-1">{s.body}</div>
          </div>
        ))}
        <div className="space-y-1">
          <h2 className="font-semibold text-gray-900">联系我们</h2>
          <p>有任何问题、想查看或删除你的资料，请发邮件到 {mail}。</p>
        </div>
      </section>

      <section id="english" className="space-y-4 rounded-2xl bg-white p-4" lang="en">
        {en.map((s) => (
          <div key={s.title} className="space-y-1">
            <h2 className="font-semibold text-gray-900">{s.title}</h2>
            <div className="space-y-1">{s.body}</div>
          </div>
        ))}
        <div className="space-y-1">
          <h2 className="font-semibold text-gray-900">Contact us</h2>
          <p>For questions, or to access or delete your data, email {mail}.</p>
        </div>
      </section>

      <p className="text-xs text-gray-500">
        <Link href="/privacy" className="underline">隐私政策 Privacy Policy</Link> ·{" "}
        <Link href="/terms" className="underline">服务条款 Terms of Service</Link>
      </p>
    </article>
  );
}

export function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
