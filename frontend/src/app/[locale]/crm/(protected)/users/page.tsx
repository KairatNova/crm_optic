"use client";

import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-5 text-sm text-amber-900">Доступно только для owner.</CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-slate-900">Администраторы</h1>
          <p className="mt-1 text-sm text-slate-600">
            Создание учётных записей с логином и паролем. После входа админ привязывает Telegram по коду из бота. Первый{" "}
            <strong>owner</strong> создаётся на сервере (скрипт/сид), не через эту форму.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Username</span>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin1" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Телефон (+996…)</span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+996700123456" />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Пароль *</span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Имя</span>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Telegram @username (опционально)</span>
              <Input
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ""))}
                placeholder="without_at"
              />
            </label>
          </div>

          <Button type="button" variant="primary" onClick={() => void onCreateAdmin()} disabled={loading}>
            {loading ? "Создаём…" : "Добавить администратора"}
          </Button>

          {message ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div>
          ) : null}
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Список админов</h2>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <p className="text-sm text-slate-500">Загрузка…</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-slate-500">Пока нет администраторов.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {admins.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm">
                  <div className="min-w-[180px]">
                    <div className="font-medium text-slate-900">{displayLogin(a)}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="muted">{a.full_name || "—"}</Badge>
                      {a.is_verified ? <Badge>verified</Badge> : <Badge variant="muted">не verified</Badge>}
                      {a.is_active ? <Badge>active</Badge> : <Badge variant="muted">off</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void toggleActive(a)}>
                      {a.is_active ? "Деактивировать" : "Активировать"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(a)}>
                      Редактировать
                    </Button>
                  </div>

                  {editingAdminId === a.id ? (
                    <div className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                          Активен
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-xs font-medium text-slate-600">Новый пароль (опционально)</span>
                          <Input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Если менять — введите новый"
                          />
                        </label>

                        <label className="grid gap-1 text-sm">
                          <span className="text-xs font-medium text-slate-600">Username</span>
                          <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="admin1" />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-xs font-medium text-slate-600">Телефон (+996…)</span>
                          <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+996700123456" />
                        </label>

                        <label className="grid gap-1 text-sm sm:col-span-2">
                          <span className="text-xs font-medium text-slate-600">Имя</span>
                          <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm sm:col-span-2">
                          <span className="text-xs font-medium text-slate-600">Email</span>
                          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm sm:col-span-2">
                          <span className="text-xs font-medium text-slate-600">Telegram @username</span>
                          <Input
                            value={editTelegramUsername}
                            onChange={(e) => setEditTelegramUsername(e.target.value.replace(/^@/, ""))}
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="primary" disabled={loading} onClick={() => void saveEditAdmin(a)}>
                          {loading ? "Сохраняем…" : "Сохранить"}
                        </Button>
                        <Button type="button" variant="outline" disabled={loading} onClick={cancelEdit}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
