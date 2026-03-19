"use client";

import { useState } from "react";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { createAdminByTelegramId } from "@/lib/crm-api";

export default function CrmUsersPage() {
  const { token, user } = useCrmSession();
  const [telegramId, setTelegramId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "doctor">("admin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onCreateUser() {
    const tg = Number(telegramId);
    if (!telegramId || Number.isNaN(tg)) {
      setError("Введите корректный числовой telegram_id");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createAdminByTelegramId(token, {
        telegram_id: tg,
        full_name: fullName.trim() || undefined,
        email: email.trim() || undefined,
        role,
      });
      setMessage(`Пользователь создан: ${created.username} (${created.role})`);
      setTelegramId("");
      setFullName("");
      setEmail("");
      setRole("admin");
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания пользователя");
      setLoading(false);
    }
  }

  if (user.role !== "owner") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Доступно только для owner.
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h1 className="text-xl font-bold">Users management</h1>
      <p className="mt-1 text-sm text-slate-600">
        Добавление админов/врачей по <code>telegram_id</code>. Первый owner создаётся через env на backend.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-slate-600">Telegram ID *</span>
          <input
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder="Например: 123456789"
            className="h-10 rounded-xl border border-slate-300 px-3"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-slate-600">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иван Иванов"
            className="h-10 rounded-xl border border-slate-300 px-3"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-slate-600">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="h-10 rounded-xl border border-slate-300 px-3"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-slate-600">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "doctor")} className="h-10 rounded-xl border border-slate-300 px-3">
            <option value="admin">admin</option>
            <option value="doctor">doctor</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => void onCreateUser()}
        disabled={loading}
        className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
      >
        {loading ? "Создаём..." : "Добавить пользователя"}
      </button>

      {message ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</div> : null}
    </div>
  );
}

