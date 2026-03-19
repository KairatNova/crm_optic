"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/i18n/locales";
import { loginByTelegramCallback } from "@/lib/crm-api";
import { saveCrmSession } from "@/lib/crm-auth";

type TelegramWidgetUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}

export default function CrmLoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = (params.locale || "ru") as Locale;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !botUsername) return;

    window.onTelegramAuth = async (user: TelegramWidgetUser) => {
      setStatus("loading");
      setMessage(null);
      try {
        const payload: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(user)) {
          if (value !== undefined && value !== null) {
            payload[key] = value as string | number;
          }
        }
        const token = await loginByTelegramCallback(payload);
        saveCrmSession(token.access_token, token.user);
        router.replace(`/${locale}/crm`);
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Ошибка входа");
      }
    };

    container.innerHTML = "";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      if (window.onTelegramAuth) {
        delete window.onTelegramAuth;
      }
      container.innerHTML = "";
    };
  }, [botUsername, locale, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">CRM Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Вход для администраторов и врачей через Telegram Login Widget.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Вариант 1 (реализован)</div>
          <p className="mt-2 text-sm text-slate-700">
            Официальная кнопка Telegram. Доступ получают только пользователи, которых owner добавил по{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">telegram_id</code> (первый owner — через env на backend).
          </p>
          <div className="mt-4">
            {!botUsername ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Укажите <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code> в <code>frontend/.env.local</code>.
              </div>
            ) : (
              <div ref={containerRef} />
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Вариант 2 (план)</div>
          <p className="mt-2 text-sm text-slate-700">
            Вход по номеру телефона + OTP в Telegram-боте (будет добавлен позже).
          </p>
        </div>

        {status === "loading" ? (
          <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            Проверяем Telegram авторизацию...
          </div>
        ) : null}
        {status === "error" && message ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{message}</div>
        ) : null}

        <div className="mt-6">
          <Link
            href={`/${locale}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Назад на сайт
          </Link>
        </div>
      </div>
    </div>
  );
}

