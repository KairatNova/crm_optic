"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { CrmUser } from "@/lib/crm-api";
import { getMe } from "@/lib/crm-api";
import { clearCrmSession, getCrmToken, saveCrmSession } from "@/lib/crm-auth";
import type { Locale } from "@/i18n/locales";

type CrmSession = {
  token: string;
  user: CrmUser;
  logout: () => void;
};

const CrmSessionContext = createContext<CrmSession | null>(null);

function displayName(u: CrmUser): string {
  return u.full_name || u.username || u.phone || `User #${u.id}`;
}

export function useCrmSession(): CrmSession {
  const ctx = useContext(CrmSessionContext);
  if (!ctx) {
    throw new Error("useCrmSession must be used inside CrmProtectedShell");
  }
  return ctx;
}

export function CrmProtectedShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CrmUser | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const accessToken = getCrmToken();
    if (!accessToken) {
      router.replace(`/${locale}/crm/login`);
      return;
    }

    void (async () => {
      try {
        const me = await getMe(accessToken);
        if (cancelled) return;
        saveCrmSession(accessToken, me);
        setToken(accessToken);
        setUser(me);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        clearCrmSession();
        const message = e instanceof Error ? e.message : "Failed to validate session";
        setError(message);
        router.replace(`/${locale}/crm/login`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  const session = useMemo<CrmSession | null>(() => {
    if (!token || !user) return null;
    return {
      token,
      user,
      logout: () => {
        clearCrmSession();
        router.replace(`/${locale}/crm/login`);
      },
    };
  }, [locale, router, token, user]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileNavOpen]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm shadow-sm">
          {error ? `Сессия недействительна: ${error}` : "Проверяем доступ к CRM..."}
        </div>
      </div>
    );
  }

  type NavLink = { href: string; label: string; icon: string };

  const links: NavLink[] = [
    { href: `/${locale}/crm`, label: "Записи", icon: "📅" },
    { href: `/${locale}/crm/board`, label: "Канбан", icon: "🧩" },
    { href: `/${locale}/crm/calendar`, label: "Календарь", icon: "🗓️" },
    { href: `/${locale}/crm/analytics`, label: "Аналитика", icon: "📊" },
    { href: `/${locale}/crm/clients`, label: "Клиенты", icon: "👥" },
    { href: `/${locale}/crm/users`, label: "Пользователи", icon: "🔐" },
    ...(session.user.role === "owner"
      ? [{ href: `/${locale}/crm/site-content`, label: "Контент сайта", icon: "🌐" }]
      : []),
  ];

  return (
    <CrmSessionContext.Provider value={session}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex max-w-[1560px] gap-4 px-2 py-2 sm:px-3 sm:py-3">
          <aside className="sticky top-2 hidden h-[calc(100vh-1rem)] w-72 flex-col rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm lg:flex">
            <div className="border-b border-slate-200 p-4">
              <div className="text-lg font-extrabold tracking-tight text-slate-900">CRM Optic</div>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={false}
                    className={[
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <span aria-hidden>{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-4 text-xs text-slate-600">
              <div className="font-semibold text-slate-900">{displayName(session.user)}</div>
              <button
                type="button"
                onClick={session.logout}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Выйти
              </button>
            </div>
          </aside>

          <div className="min-h-screen flex-1 lg:min-h-0">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur sm:px-4 lg:hidden">
              <div className="flex items-center gap-2 pt-[env(safe-area-inset-top,0px)]">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 active:bg-slate-100"
                  aria-expanded={mobileNavOpen}
                  aria-controls="crm-mobile-drawer"
                >
                  <span className="sr-only">Открыть меню разделов</span>
                  <span className="flex flex-col gap-1.5" aria-hidden>
                    <span className="block h-0.5 w-5 rounded-full bg-slate-700" />
                    <span className="block h-0.5 w-5 rounded-full bg-slate-700" />
                    <span className="block h-0.5 w-5 rounded-full bg-slate-700" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{displayName(session.user)}</div>
                  <div className="text-xs capitalize text-slate-500">{session.user.role}</div>
                </div>
                <button
                  type="button"
                  onClick={session.logout}
                  className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                >
                  Выйти
                </button>
              </div>
            </header>
            <main className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:p-4 lg:p-5">
              {children}
            </main>

            <div
              className={[
                "fixed inset-0 z-40 lg:hidden",
                mobileNavOpen ? "pointer-events-auto" : "pointer-events-none invisible",
              ].join(" ")}
              aria-hidden={!mobileNavOpen}
            >
              <button
                type="button"
                className={[
                  "absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] transition-opacity duration-200",
                  mobileNavOpen ? "opacity-100" : "opacity-0",
                ].join(" ")}
                aria-label="Закрыть меню"
                tabIndex={mobileNavOpen ? 0 : -1}
                onClick={() => setMobileNavOpen(false)}
              />
              <aside
                id="crm-mobile-drawer"
                className={[
                  "absolute left-0 top-0 flex h-[100dvh] max-h-[100dvh] min-h-0 w-[min(20rem,88vw)] flex-col border-r border-slate-200 bg-white pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] shadow-2xl transition-transform duration-200 ease-out",
                  mobileNavOpen ? "translate-x-0" : "-translate-x-full",
                ].join(" ")}
                role="dialog"
                aria-modal="true"
                aria-label="Разделы CRM"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <div className="text-lg font-extrabold tracking-tight text-slate-900">CRM Optic</div>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Закрыть
                  </button>
                </div>
                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
                  {links.map((link) => {
                    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        prefetch={false}
                        onClick={() => setMobileNavOpen(false)}
                        className={[
                          "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                          active
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                        ].join(" ")}
                      >
                        <span aria-hidden>{link.icon}</span>
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="border-t border-slate-200 p-4 text-xs text-slate-600">
                  <div className="font-semibold text-slate-900">{displayName(session.user)}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      session.logout();
                    }}
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Выйти
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </CrmSessionContext.Provider>
  );
}

