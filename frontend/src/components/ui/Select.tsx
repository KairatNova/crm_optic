"use client";

import { cx } from "@/lib/ui";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200",
        className,
      )}
      {...props}
    />
  );
}

