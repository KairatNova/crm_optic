"use client";

import { cx } from "@/lib/ui";

type Variant = "default" | "muted";

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        variant === "muted" ? "bg-slate-100 text-slate-800" : "bg-slate-900 text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

