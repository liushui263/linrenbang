/** 邻人帮品牌标志：绿色圆角方块 + 白色房子 + 暖橙爱心。母版见 public/logo.svg */
export default function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lrb-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#lrb-logo-bg)" />
      <path d="M20 57 L60 22 L100 57" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 54 L60 30 L88 54 V91 a7 7 0 0 1 -7 7 H39 a7 7 0 0 1 -7 -7 Z" fill="#fff" />
      <path
        d="M60 88 C57 85 43 76 43 65.5 C43 59.5 47.5 55.5 52.5 55.5 C56 55.5 58.6 57.4 60 60.2 C61.4 57.4 64 55.5 67.5 55.5 C72.5 55.5 77 59.5 77 65.5 C77 76 63 85 60 88 Z"
        fill="#f59e0b"
      />
    </svg>
  );
}
