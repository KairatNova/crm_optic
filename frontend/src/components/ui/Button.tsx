"use client";

import { cx } from "@/lib/ui";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-60 disabled:pointer-events-none";

const variantClass: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 shadow-none",
  danger: "border border-rose-300 bg-white text-rose-800 hover:bg-rose-50",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3",
  md: "h-10 px-4",
};

export function Button({
  className,
  variant = "outline",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cx(base, variantClass[variant], sizeClass[size], className)} {...props} />;
}

