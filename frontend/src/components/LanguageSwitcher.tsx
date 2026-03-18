"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/locales";
import { LOCALES, isLocale } from "@/i18n/locales";

export function LanguageSwitcher({
  currentLocale,
  labels,
}: {
  currentLocale: Locale;
  labels: { label: string; ru: string; ky: string; en: string };
}) {
  const pathname = usePathname() || "/";
  const parts = pathname.split("/").filter(Boolean);
  const rest = isLocale(parts[0] || "") ? parts.slice(1) : parts;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const items = useMemo(
    () =>
      LOCALES.map((l) => ({
        locale: l,
        label: labels[l],
      })),
    [labels],
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={labels.label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm outline-none ring-teal-200 hover:bg-zinc-50 focus:ring-4"
      >
        <span className="grid size-6 place-items-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
          {currentLocale.toUpperCase()}
        </span>
        <span className="hidden sm:inline">{labels[currentLocale]}</span>
        <span className={`text-zinc-500 transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl"
        >
          {items.map((it) => {
            const active = it.locale === currentLocale;
            return (
              <button
                key={it.locale}
                type="button"
                role="menuitem"
                onClick={() => {
                  const next = it.locale;
                  const nextPath = `/${next}/${rest.join("/")}`.replace(/\/+$/, "") || `/${next}`;
                  window.location.href = nextPath;
                }}
                className={[
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm",
                  active ? "bg-teal-50 text-teal-800" : "hover:bg-zinc-50 text-zinc-900",
                ].join(" ")}
              >
                <span className="font-semibold">{it.label}</span>
                <span className="text-xs text-zinc-500">{it.locale.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

