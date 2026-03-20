"use client";

import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import type { CrmUser } from "@/lib/crm-api";
import { createOwnerAdmin, listOwnerAdmins, patchOwnerAdmin } from "@/lib/crm-api";

function displayLogin(u: CrmUser): string {
  return u.username || u.phone || `#${u.id}`;
}

export default function CrmUsersPage() {
  const { token, user } = useCrmSession();
  const [admins, setAdmins] = useState<CrmUser[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState<string>("");
  const [editUsername, setEditUsername] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editFullName, setEditFullName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editTelegramUsername, setEditTelegramUsername] = useState<string>("");

  const refresh = useCallback(async () => {
    setListLoading(true);
    try {
      const rows = await listOwnerAdmins(token);
      setAdmins(rows);
    } catch {
      setAdmins([]);
    } finally {
      setListLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user.role === "owner") void refresh();
  }, [user.role, refresh]);

  async function onCreateAdmin() {
    if (!username.trim() && !phone.trim()) {
      setError("Укажите username или телефон (+996…).");
      return;
    }
    if (!password || password.length < 8) {
      setError("Пароль не короче 8 символов.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createOwnerAdmin(token, {
        username: username.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        full_name: fullName.trim() || undefined,
        email: email.trim() || undefined,
        telegram_username: telegramUsername.trim() || undefined,
        role: "admin",
      });
      setMessage(`Администратор создан: ${displayLogin(created)}`);
      setUsername("");
      setPhone("");
      setPassword("");
      setFullName("");
      setEmail("");
      setTelegramUsername("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(admin: CrmUser) {
    setError(null);
    try {
      await patchOwnerAdmin(token, admin.id, { is_active: !admin.is_active });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить");
    }
  }

  function startEdit(admin: CrmUser) {
    setError(null);
    setMessage(null);
    setEditingAdminId(admin.id);
    setEditActive(admin.is_active);
    setEditPassword("");
    setEditUsername(admin.username || "");
    setEditPhone(admin.phone || "");
    setEditFullName(admin.full_name || "");
    setEditEmail(admin.email || "");
    setEditTelegramUsername(admin.telegram_username || "");
  }

  function cancelEdit() {
    setEditingAdminId(null);
    setEditActive(true);
    setEditPassword("");
    setEditUsername("");
    setEditPhone("");
    setEditFullName("");
    setEditEmail("");
    setEditTelegramUsername("");
  }

  async function saveEditAdmin(admin: CrmUser) {
    setError(null);
    setMessage(null);
    if (!editActive && admin.is_active === false) {
      // Ничего не меняем по активности, но это ок — просто не будем валидировать.
    }

    if (editPassword.trim() && editPassword.trim().length < 8) {
      setError("Пароль не короче 8 символов.");
      return;
    }

    setLoading(true);
    try {
      const maybe = (v: string): string | undefined => {
        const t = v.trim();
        return t ? t : undefined;
      };

      const payload: {
        is_active: boolean;
        password?: string | null;
        username?: string | null;
        phone?: string | null;
        full_name?: string | null;
        email?: string | null;
        telegram_username?: string | null;
      } = {
        is_active: editActive,
      };
      if (editPassword.trim()) payload.password = editPassword.trim();
      const u = maybe(editUsername);
      const p = maybe(editPhone);
      const fn = maybe(editFullName);
      const em = maybe(editEmail);
      const tgu = maybe(editTelegramUsername);

      if (u) payload.username = u;
      if (p) payload.phone = p;
      if (fn) payload.full_name = fn;
      if (em) payload.email = em;
      if (tgu) payload.telegram_username = tgu;

      await patchOwnerAdmin(token, admin.id, payload);
      setMessage("Администратор обновлён.");
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить администратора");
    } finally {
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
    <div className="max-w-3xl space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Администраторы</h1>
        <p className="mt-1 text-sm text-slate-600">
          Создание учётных записей с логином и паролем. После входа админ привязывает Telegram по коду из бота. Первый{" "}
          <strong>owner</strong> создаётся на сервере (скрипт/сид), не через эту форму.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin1"
              className="h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Телефон (+996…)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+996700123456"
              className="h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Пароль *</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Имя</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Telegram @username (опционально)</span>
            <input
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ""))}
              placeholder="without_at"
              className="h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void onCreateAdmin()}
          disabled={loading}
          className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
        >
          {loading ? "Создаём…" : "Добавить администратора"}
        </button>

        {message ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div> : null}
        {error ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</div> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Список админов</h2>
        {listLoading ? (
          <p className="mt-2 text-sm text-slate-500">Загрузка…</p>
        ) : admins.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Пока нет администраторов.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {admins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-[180px]">
                  <div className="font-medium">{displayLogin(a)}</div>
                  <div className="text-xs text-slate-500">
                    {a.full_name || "—"} · verified: {a.is_verified ? "да" : "нет"} · active: {a.is_active ? "да" : "нет"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleActive(a)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                  >
                    {a.is_active ? "Деактивировать" : "Активировать"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                  >
                    Редактировать
                  </button>
                </div>

                {editingAdminId === a.id ? (
                  <div className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                        Активен
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">Новый пароль (опционально)</span>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Если менять — введите новый"
                          className="h-10 rounded-xl border border-slate-300 px-3"
                        />
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">Username</span>
                        <input
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          placeholder="admin1"
                          className="h-10 rounded-xl border border-slate-300 px-3"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-600">Телефон (+996…)</span>
                        <input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="+996700123456"
                          className="h-10 rounded-xl border border-slate-300 px-3"
                        />
                      </label>

                      <label className="grid gap-1 text-sm sm:col-span-2">
                        <span className="text-xs font-medium text-slate-600">Имя</span>
                        <input
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="h-10 rounded-xl border border-slate-300 px-3"
                        />
                      </label>
                      <label className="grid gap-1 text-sm sm:col-span-2">
                        <span className="text-xs font-medium text-slate-600">Email</span>
                        <input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="h-10 rounded-xl border border-slate-300 px-3"
                        />
                      </label>
                      <label className="grid gap-1 text-sm sm:col-span-2">
                        <span className="text-xs font-medium text-slate-600">Telegram @username</span>
                        <input
                          value={editTelegramUsername}
                          onChange={(e) => setEditTelegramUsername(e.target.value.replace(/^@/, ""))}
                          className="h-10 rounded-xl border border-slate-300 px-3"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void saveEditAdmin(a)}
                        className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
                      >
                        {loading ? "Сохраняем…" : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={cancelEdit}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
