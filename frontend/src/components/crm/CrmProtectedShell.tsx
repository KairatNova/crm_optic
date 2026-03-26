"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";

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

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm shadow-sm">
          {error ? `Сессия недействительна: ${error}` : "Проверяем доступ к CRM..."}
        </div>
      </div>
    );
  }

  const links = [
    { href: `/${locale}/crm`, label: "Записи", icon: "📅" },
    { href: `/${locale}/crm/board`, label: "Канбан", icon: "🧩" },
    { href: `/${locale}/crm/calendar`, label: "Календарь", icon: "🗓️" },
    { href: `/${locale}/crm/analytics`, label: "Аналитика", icon: "📊" },
    { href: `/${locale}/crm/clients`, label: "Клиенты", icon: "👥" },
    { href: `/${locale}/crm/users`, label: "Пользователи", icon: "🔐" },
    ...(session.user.role === "owner"
      ? ([{ href: `/${locale}/crm/site-content`, label: "Контент сайта", icon: "🌐" }] as const)
      : []),
  ];

  return (
    <CrmSessionContext.Provider value={session}>
      <Toaster position="top-right" richColors closeButton />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex max-w-[1560px] gap-4 px-2 py-2 sm:px-3 sm:py-3">
          <aside className="sticky top-2 hidden h-[calc(100vh-1rem)] w-72 flex-col rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm lg:flex">
            <div className="border-b border-slate-200 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CRM Optic</div>
              <div className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">Admin Panel</div>
              <div className="mt-1 text-xs text-slate-500">Управление клиентами и записями</div>
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
              <div className="mt-1">Роль: {session.user.role}</div>
              <button
                type="button"
                onClick={session.logout}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Выйти
              </button>
            </div>
          </aside>

          <div className="min-h-screen flex-1">
            <header className="sticky top-2 z-20 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">CRM Workspace</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {displayName(session.user)} ({session.user.role})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${locale}/crm`}
                    className="hidden rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
                  >
                    Главная CRM
                  </Link>
                  <button
                    type="button"
                    onClick={session.logout}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 lg:hidden"
                  >
                    Выйти
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
                {links.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      className={[
                        "whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {link.icon} {link.label}
                    </Link>
                  );
                })}
              </div>
            </header>
            <main className="p-3 sm:p-4 lg:p-5">{children}</main>
          </div>
        </div>
      </div>
    </CrmSessionContext.Provider>
  );
}

