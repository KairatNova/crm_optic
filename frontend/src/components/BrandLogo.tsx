type BrandLogoProps = {
  className?: string;
  compact?: boolean;
};

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 220 120" className="h-10 w-auto sm:h-12" aria-hidden="true">
          <path
            d="M18 62c16-20 38-32 68-34 30 2 52 14 68 34-16 20-38 32-68 34-30-2-52-14-68-34Z"
            fill="none"
            stroke="#14b8a6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M50 62c12-14 25-22 44-24 20 2 34 10 46 24-12 14-26 22-46 24-19-2-32-10-44-24Z"
            fill="none"
            stroke="#0f766e"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="112" cy="62" r="25" fill="#22d3ee" stroke="#0e7490" strokeWidth="6" />
          <circle cx="122" cy="52" r="6" fill="#ffffff" />
        </svg>
        {!compact ? (
          <div className="leading-tight">
            <div className="text-lg font-black tracking-wide text-zinc-900 sm:text-xl">ЦЕНТР ОПТИКИ</div>
            <div className="text-sm font-semibold tracking-[0.25em] text-cyan-700">EYEWEAR</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
