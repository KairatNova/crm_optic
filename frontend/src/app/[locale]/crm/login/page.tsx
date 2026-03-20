"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import type { Locale } from "@/i18n/locales";
import { authLoginRequest, authLoginVerify } from "@/lib/crm-api";
import { saveCrmSession } from "@/lib/crm-auth";

type Step = "credentials" | "telegram";

export default function CrmLoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = (params.locale || "ru") as Locale;

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
      setError("Введите логин и пароль.");
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
      setError(e instanceof Error ? e.message : "Не удалось запросить код");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setError(null);
    const trimmed = code.replace(/\s/g, "");
    if (!trimmed || trimmed.length !== 6) {
      setError("Введите 6-значный код из Telegram.");
      return;
    }
    setLoading(true);
    try {
      const token = await authLoginVerify({ login: login.trim(), verification_code: trimmed });
      saveCrmSession(token.access_token, token.user);
      router.replace(`/${locale}/crm`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неверный код или срок действия истёк");
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
        <h1 className="text-2xl font-bold text-slate-900">Вход в CRM</h1>
        <p className="mt-2 text-sm text-slate-600">
          Для <strong>владельца</strong> и <strong>администраторов</strong>: логин (имя пользователя или телефон в формате{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">+996…</code>), пароль, затем код из Telegram-бота.
        </p>

        {step === "credentials" ? (
          <div className="mt-6 space-y-4">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Логин</span>
              <input
                type="text"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="username или +996700123456"
                className="h-11 rounded-xl border border-slate-300 px-3"
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
              />
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={() => void onRequestCode()}
              className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
            >
              {loading ? "Отправляем…" : "Получить код в Telegram"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
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
              />
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={() => void onVerify()}
              className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
            >
              {loading ? "Проверяем…" : "Войти"}
            </button>
            <button
              type="button"
              onClick={onBackToCredentials}
              className="w-full rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Назад: другой логин или пароль
            </button>
          </div>
        )}

        {error ? (
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
