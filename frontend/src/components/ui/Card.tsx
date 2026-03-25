"use client";

import { cx } from "@/lib/ui";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("px-4 py-4 sm:px-5", className)}>{children}</div>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("px-4 pb-4 sm:px-5 sm:pb-5", className)}>{children}</div>;
}

