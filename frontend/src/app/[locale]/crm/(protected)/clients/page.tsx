"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import type { ClientRead } from "@/lib/crm-api";
import { createClient, getClients } from "@/lib/crm-api";

type SearchMode = "all" | "name" | "phone" | "email";

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function normalizePhoneForSearch(q: string): string {
  // Убираем нецифры, чтобы искать по номеру даже если пользователь вводит форматирование.
  return q.replace(/[^\d+]/g, "");
}

export default function ClientsPage() {
  const { token } = useCrmSession();
  const params = useParams<{ locale: string }>();
  const locale = params.locale || "ru";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRead[]>([]);

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("all");

  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createGender, setCreateGender] = useState("");
  const [createBirthDate, setCreateBirthDate] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getClients(token);
      setClients(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки клиентов");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return clients;

    const qDigits = normalizePhoneForSearch(q).replace(/\+/g, "");

    return clients.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const phoneDigits = normalizePhoneForSearch(phone).replace(/\+/g, "");

      if (mode === "name") return name.includes(q);
      if (mode === "email") return email.includes(q);
      if (mode === "phone") return phoneDigits.includes(qDigits) || phone.includes(q);

      // mode === "all"
      return name.includes(q) || email.includes(q) || phoneDigits.includes(qDigits) || phone.includes(q);
    });
  }, [clients, mode, query]);

  async function onCreateClient() {
    setCreateLoading(true);
    setError(null);
    try {
      if (!createName.trim() || !createPhone.trim()) {
        setError("Имя и телефон обязательны.");
        return;
      }

      await createClient(token, {
        name: createName.trim(),
        phone: createPhone.trim(),
        email: createEmail.trim() || undefined,
        gender: createGender.trim() || undefined,
        birth_date: createBirthDate.trim() || undefined,
      });

      setCreateName("");
      setCreatePhone("");
      setCreateEmail("");
      setCreateGender("");
      setCreateBirthDate("");
      await loadClients();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать клиента");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Клиенты</h1>
        <p className="mt-1 text-sm text-slate-600">Список клиентов и поиск по имени/телефону/email.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Поиск</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="например: Иван / +996700123456 / admin@example.com"
              className="h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Поиск по</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as SearchMode)} className="h-10 rounded-xl border border-slate-300 px-3">
              <option value="all">все</option>
              <option value="name">имя</option>
              <option value="phone">телефон</option>
              <option value="email">email</option>
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">Добавить клиента</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Имя *</span>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 px-3"
                placeholder="Иван Иванов"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Телефон *</span>
              <input
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 px-3"
                placeholder="+996700123456"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3" placeholder="admin@example.com" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Пол</span>
              <input value={createGender} onChange={(e) => setCreateGender(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3" placeholder="M/F" />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Дата рождения</span>
              <input type="date" value={createBirthDate} onChange={(e) => setCreateBirthDate(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3" />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void onCreateClient()}
            disabled={createLoading}
            className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
          >
            {createLoading ? "Создаём..." : "Добавить клиента"}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Клиент</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Дата рождения</th>
              <th className="px-4 py-3">Открыть</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-slate-500">
                  Загрузка...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-slate-500">
                  Клиентов не найдено
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{c.name || "—"}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">{c.email || "—"}</td>
                  <td className="px-4 py-3">{c.birth_date ? new Date(c.birth_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <a href={`/${locale}/crm/clients/${c.id}`} className="text-teal-700 hover:underline">
                      Открыть
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

