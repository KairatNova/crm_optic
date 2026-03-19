"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { AppointmentRead, ClientRead } from "@/lib/crm-api";
import { getAppointments, getClient, patchAppointment } from "@/lib/crm-api";
import { useCrmSession } from "@/components/crm/CrmProtectedShell";

type AppointmentRow = AppointmentRead & {
  client_name?: string;
  client_phone?: string;
};

export default function CrmAppointmentsPage() {
  const { token } = useCrmSession();
  const params = useParams<{ locale: string }>();
  const locale = params.locale || "ru";
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const appts = await getAppointments(token, statusFilter === "all" ? undefined : statusFilter);
        const uniqClientIds = Array.from(new Set(appts.map((a) => a.client_id)));
        const clientsPairs = await Promise.all(
          uniqClientIds.map(async (id) => {
            try {
              const c = await getClient(token, id);
              return [id, c] as const;
            } catch {
              return [id, null] as const;
            }
          }),
        );
        const clientsMap = new Map<number, ClientRead | null>(clientsPairs);
        const rows = appts.map((a) => {
          const c = clientsMap.get(a.client_id);
          return {
            ...a,
            client_name: c?.name || "Unknown",
            client_phone: c?.phone || "",
          };
        });
        if (!cancelled) {
          setAppointments(rows);
          setLoading(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, token]);

  const filteredByDate = useMemo(() => {
    return appointments.filter((a) => {
      const day = new Date(a.starts_at).toISOString().slice(0, 10);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      return true;
    });
  }, [appointments, fromDate, toDate]);

  async function toggleStatus(row: AppointmentRow) {
    const next = row.status === "done" ? "new" : "done";
    try {
      const updated = await patchAppointment(token, row.id, { status: next });
      setAppointments((prev) => prev.map((x) => (x.id === row.id ? { ...x, ...updated } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить статус");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold">Appointments</h1>
        <p className="mt-1 text-sm text-slate-600">Список записей из CRM, фильтр по статусу и периоду.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Статус</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="all">all</option>
              <option value="new">new</option>
              <option value="done">done</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Дата от</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Дата до</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            />
          </label>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Клиент</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Услуга</th>
              <th className="px-4 py-3">Дата/время</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Действие</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  Загрузка...
                </td>
              </tr>
            ) : filteredByDate.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  Записей пока нет
                </td>
              </tr>
            ) : (
              filteredByDate.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/${locale}/crm/clients/${row.client_id}`} className="text-teal-700 hover:underline">
                      {row.client_name || `Client #${row.client_id}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.client_phone || "—"}</td>
                  <td className="px-4 py-3">{row.service || "—"}</td>
                  <td className="px-4 py-3">{new Date(row.starts_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                        row.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700",
                      ].join(" ")}
                    >
                      {row.status || "new"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleStatus(row)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {row.status === "done" ? "Вернуть в new" : "Отметить done"}
                    </button>
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

