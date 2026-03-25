"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ClientRead, OwnerExportVariant } from "@/lib/crm-api";
import { createClient, downloadOwnerExportExcel, getClients } from "@/lib/crm-api";

type SearchMode = "all" | "name" | "phone" | "email";
const PAGE_SIZE = 15;

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function normalizePhoneForSearch(q: string): string {
  // Убираем нецифры, чтобы искать по номеру даже если пользователь вводит форматирование.
  return q.replace(/[^\d+]/g, "");
}

export default function ClientsPage() {
  const { token, user } = useCrmSession();
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
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportBusy, setExportBusy] = useState<OwnerExportVariant | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportMenuOpen]);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [currentPage, filtered]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, mode, clients]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
      setCreateFormOpen(false);
      await loadClients();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать клиента");
    } finally {
      setCreateLoading(false);
    }
  }

  async function onExport(variant: OwnerExportVariant) {
    setExportBusy(variant);
    setError(null);
    try {
      await downloadOwnerExportExcel(token, variant);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось скачать экспорт");
    } finally {
      setExportBusy(null);
    }
    setExportMenuOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CRM</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Клиенты</h1>
            <p className="mt-1 text-sm text-slate-600">Поиск и карточка клиента (визиты / тесты / история записей).</p>
          </div>
          {user.role === "owner" ? (
            <div ref={exportMenuRef} className="relative shrink-0">
              <Button variant="outline" onClick={() => setExportMenuOpen((o) => !o)}>
                Экспорт
              </Button>
              {exportMenuOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-[min(100vw-2rem,22rem)] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    disabled={exportBusy !== null}
                    onClick={() => void onExport("clients_latest_vision")}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {exportBusy === "clients_latest_vision" ? "Готовим файл…" : "Клиенты + последние записи зрения"}
                  </button>
                  <button
                    type="button"
                    disabled={exportBusy !== null}
                    onClick={() => void onExport("clients_all_vision")}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {exportBusy === "clients_all_vision" ? "Готовим файл…" : "Клиенты + все записи зрения"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Поиск</span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="например: Иван / +996700123456 / admin@example.com"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Поиск по</span>
            <Select value={mode} onChange={(e) => setMode(e.target.value as SearchMode)}>
              <option value="all">все</option>
              <option value="name">имя</option>
              <option value="phone">телефон</option>
              <option value="email">email</option>
            </Select>
          </label>
        </div>

        <div className="mt-4">
          <Button variant="outline" onClick={() => setCreateFormOpen((v) => !v)}>
            {createFormOpen ? "Скрыть форму добавления" : "Добавить клиента"}
          </Button>
        </div>

        {createFormOpen ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Имя *</span>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Иван Иванов" className="h-9" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Телефон *</span>
                <Input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="+996700123456" className="h-9" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Email</span>
                <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="admin@example.com" className="h-9" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Пол</span>
                <Input value={createGender} onChange={(e) => setCreateGender(e.target.value)} placeholder="M/F" className="h-9" />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Дата рождения</span>
                <Input type="date" value={createBirthDate} onChange={(e) => setCreateBirthDate(e.target.value)} className="h-9" />
              </label>
            </div>
            <Button variant="primary" onClick={() => void onCreateClient()} disabled={createLoading} className="mt-3 w-full">
              {createLoading ? "Создаём..." : "Сохранить клиента"}
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      {!listVisible ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Button variant="primary" onClick={() => setListVisible(true)}>
            Показать список клиентов
          </Button>
          <p className="mt-2 text-xs text-slate-600">Найдено: {filtered.length}. На странице отображается до {PAGE_SIZE} клиентов.</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="text-sm text-slate-600">
              {loading ? "Загрузка..." : `Показано ${paginated.length} из ${filtered.length}`}
            </div>
            <button
              type="button"
              onClick={() => setListVisible(false)}
              className="shrink-0"
            >
              <Button variant="outline" size="sm">Скрыть список</Button>
            </button>
          </div>
          <div className="overflow-x-auto">
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
                  paginated.map((c) => (
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
          <div className="flex items-center justify-between gap-2 px-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading || filtered.length === 0}
            >
              Назад
            </Button>
            <div className="text-sm text-slate-600">
              Страница {Math.min(currentPage, totalPages)} из {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading || filtered.length === 0}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

