import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-16 text-center">
      <p className="text-4xl">🏚️</p>
      <p className="text-gray-600">页面不存在，或者商家暂时不展示。</p>
      <Link href="/" className="text-emerald-700 underline">
        回首页
      </Link>
    </div>
  );
}
