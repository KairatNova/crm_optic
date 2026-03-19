"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/locales";

export function MobileMenu({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { menu: string; about: string; services: string; shop: string; booking: string; crm: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 md:hidden"
        aria-label={labels.menu}
      >
        ☰
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{labels.menu}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {[
                { id: "about", label: labels.about },
                { id: "services", label: labels.services },
                { id: "shop", label: labels.shop },
                { id: "booking", label: labels.booking },
              ].map((x) => (
                <a
                  key={x.id}
                  href={`/${locale}/#${x.id}`}
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  {x.label}
                </a>
              ))}
              <a
                href={`/${locale}/crm/login`}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                {labels.crm}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

