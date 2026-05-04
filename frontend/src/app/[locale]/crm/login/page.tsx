"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Locale } from "@/i18n/locales";
import { authLoginRequest, authLoginVerify } from "@/lib/crm-api";
import { saveCrmSession } from "@/lib/crm-auth";

type Step = "credentials" | "telegram";

function LoginFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка формы">
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-11 animate-pulse rounded-xl bg-teal-600/25" />
    </div>
  );
}

export default function CrmLoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = (params.locale || "ru") as Locale;

  const [fieldsMounted, setFieldsMounted] = useState(false);
  useEffect(() => {
    let alive = true;
    const id = window.setTimeout(() => {
      if (alive) setFieldsMounted(true);
    }, 50);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, []);

  const [step, setStep] = useState<Step>("credentials");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRequestCode() {
    setError(null);
    setHintMessage(null);
    if (!login.trim() || !password) {
      const msg = "Введите логин и пароль.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const out = await authLoginRequest({ login: login.trim(), password });
      setTelegramLink(out.telegram_link);
      setHintMessage(out.message);
      setStep("telegram");
      setCode("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось запросить код";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setError(null);
    const trimmed = code.replace(/\s/g, "");
    if (!trimmed || trimmed.length !== 6) {
      const msg = "Введите 6-значный код из Telegram.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const token = await authLoginVerify({ login: login.trim(), verification_code: trimmed });
      saveCrmSession(token.access_token, token.user);
      router.replace("/ru/crm");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Неверный код или срок действия истёк";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function onBackToCredentials() {
    setStep("credentials");
    setTelegramLink(null);
    setHintMessage(null);
    setCode("");
    setError(null);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {!fieldsMounted ? (
          <LoginFormSkeleton />
        ) : step === "credentials" ? (
          <div className="space-y-4" suppressHydrationWarning>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Логин</span>
              <input
                type="text"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 px-3"
                suppressHydrationWarning
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Пароль</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 px-3"
                suppressHydrationWarning
              />
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={() => void onRequestCode()}
              className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
              suppressHydrationWarning
            >
              {loading ? "Вход…" : "Вход"}
            </button>
          </div>
        ) : (
          <div className="space-y-4" suppressHydrationWarning>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {hintMessage ? <p className="whitespace-pre-wrap">{hintMessage}</p> : null}
              {telegramLink ? (
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Открыть бота в Telegram
                </a>
              ) : null}
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Код из Telegram (6 цифр)</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="h-11 rounded-xl border border-slate-300 px-3 font-mono text-lg tracking-widest"
                suppressHydrationWarning
              />
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={() => void onVerify()}
              className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
              suppressHydrationWarning
            >
              {loading ? "Проверяем…" : "Войти"}
            </button>
            <button
              type="button"
              onClick={onBackToCredentials}
              className="w-full rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              suppressHydrationWarning
            >
              Назад: другой логин или пароль
            </button>
          </div>
        )}

        {fieldsMounted && error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</div>
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
