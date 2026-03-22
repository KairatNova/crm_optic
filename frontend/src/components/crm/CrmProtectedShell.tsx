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
    { href: `/${locale}/crm`, label: "Записи" },
    { href: `/${locale}/crm/board`, label: "Доска" },
    { href: `/${locale}/crm/clients`, label: "Клиенты" },
    { href: `/${locale}/crm/users`, label: "Пользователи" },
  ];

  return (
    <CrmSessionContext.Provider value={session}>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <div className="mx-auto flex max-w-[1400px]">
          <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-700/50 bg-slate-900 text-slate-100 lg:flex">
            <div className="border-b border-slate-700/70 p-5">
              <div className="text-xs tracking-wide text-slate-400">CRM Optic</div>
              <div className="mt-1 text-lg font-bold">Панель</div>
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
                      "block rounded-xl px-3 py-2 text-sm font-medium transition",
                      active ? "bg-teal-500/20 text-teal-200" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    ].join(" ")}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-700/70 p-4 text-xs text-slate-300">
              <div className="font-semibold text-slate-100">{displayName(session.user)}</div>
              <div className="mt-1 text-slate-400">Роль: {session.user.role}</div>
              <button
                type="button"
                onClick={session.logout}
                className="mt-3 w-full rounded-lg border border-slate-600 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-800"
              >
                Выйти
              </button>
            </div>
          </aside>

          <div className="min-h-screen flex-1">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Панель CRM</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {displayName(session.user)} ({session.user.role})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={session.logout}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 lg:hidden"
                >
                  Выйти
                </button>
              </div>
            </header>
            <main className="p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </div>
    </CrmSessionContext.Provider>
  );
}

