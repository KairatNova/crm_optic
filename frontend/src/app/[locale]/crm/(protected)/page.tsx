"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  BOARD_SERVICE_FILTER_OPTIONS,
  appointmentStatusBadgeClass,
  isKnownAppointmentStatus,
  matchesBoardServiceFilter,
  type BoardServiceFilter,
} from "@/lib/crm-appointment-filters";
import type { AppointmentRead, AppointmentStatus, ClientRead } from "@/lib/crm-api";
import { getAppointments, getClient, patchAppointment } from "@/lib/crm-api";
import { useCrmSession } from "@/components/crm/CrmProtectedShell";

type AppointmentRow = AppointmentRead & {
  client_name?: string;
  client_phone?: string;
};

function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type ApiStatusFilter = "all" | AppointmentStatus;

export default function CrmAppointmentsPage() {
  const { token } = useCrmSession();
  const params = useParams<{ locale: string }>();
  const locale = params.locale || "ru";
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [apiStatusFilter, setApiStatusFilter] = useState<ApiStatusFilter>("new");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>(() => todayLocalDate());
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<BoardServiceFilter>("all");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const appts = await getAppointments(token, apiStatusFilter === "all" ? undefined : apiStatusFilter);
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
            client_name: c?.name || "Неизвестно",
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
  }, [apiStatusFilter, token]);

  const filteredRows = useMemo(() => {
    let rows = appointments;

    rows = rows.filter((a) => {
      const day = new Date(a.starts_at).toISOString().slice(0, 10);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      return true;
    });

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/[^\d+]/g, "");
      rows = rows.filter((a) => {
        const name = (a.client_name || "").toLowerCase();
        const phone = (a.client_phone || "").toLowerCase();
        const phoneDigits = phone.replace(/[^\d+]/g, "").replace(/\+/g, "");
        const service = (a.service || "").toLowerCase();
        const comment = (a.comment || "").toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          (qDigits && phoneDigits.includes(qDigits.replace(/\+/g, ""))) ||
          service.includes(q) ||
          comment.includes(q)
        );
      });
    }

    if (serviceFilter !== "all") {
      rows = rows.filter((a) => matchesBoardServiceFilter(a.service, serviceFilter));
    }

    return rows;
  }, [appointments, fromDate, toDate, searchQuery, serviceFilter]);

  async function setAppointmentStatus(row: AppointmentRow, next: AppointmentStatus) {
    const current = row.status || "new";
    if (current === next) return;
    setUpdatingId(row.id);
    setError(null);
    const previous = appointments;
    setAppointments((prev) => prev.map((x) => (x.id === row.id ? { ...x, status: next } : x)));
    try {
      const updated = await patchAppointment(token, row.id, { status: next });
      setAppointments((prev) =>
        prev.map((x) =>
          x.id === row.id ? { ...x, ...updated, client_name: x.client_name, client_phone: x.client_phone } : x,
        ),
      );
    } catch (e) {
      setAppointments(previous);
      setError(e instanceof Error ? e.message : "Не удалось обновить статус");
    } finally {
      setUpdatingId(null);
    }
  }

  function statusSelectValue(row: AppointmentRow): string {
    const s = row.status || "new";
    return isKnownAppointmentStatus(s) ? s : s;
  }

  function statusBadgeText(row: AppointmentRow): string {
    const s = row.status || "new";
    if (isKnownAppointmentStatus(s)) return APPOINTMENT_STATUS_LABELS[s];
    return s;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Записи</h1>
            <p className="mt-1 text-sm text-slate-600">Список записей, фильтры и смена статуса (как на доске).</p>
          </div>
          <Link
            href={`/${locale}/crm/board`}
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Открыть доску
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="grid gap-1 text-sm sm:col-span-2 lg:col-span-2">
            <span className="text-xs font-medium text-slate-600">Поиск</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Имя, телефон, услуга, комментарий…"
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Статус (загрузка с сервера)</span>
            <select
              value={apiStatusFilter}
              onChange={(e) => setApiStatusFilter(e.target.value as ApiStatusFilter)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="all">Все статусы</option>
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPOINTMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Услуга</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as BoardServiceFilter)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            >
              {BOARD_SERVICE_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-slate-500 sm:col-span-2 lg:col-span-2 lg:self-end">
            В таблице: <span className="font-semibold text-slate-700">{filteredRows.length}</span> из загруженных{" "}
            {appointments.length}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Дата от (необязательно)</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Дата до (по умолчанию — сегодня)</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          «Дата от» можно не заполнять. «Дата до» изначально сегодня; очистите поле, чтобы не ограничивать период сверху.
        </p>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Клиент</th>
              <th className="px-4 py-3">Запись</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Услуга</th>
              <th className="px-4 py-3">Дата/время</th>
              <th className="px-4 py-3">Комментарий</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 min-w-[11rem]">Изменить статус</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={8}>
                  Загрузка...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={8}>
                  Записей пока нет
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/${locale}/crm/clients/${row.client_id}`} className="text-teal-700 hover:underline">
                      {row.client_name || `Клиент #${row.client_id}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/${locale}/crm/appointments/${row.id}`} className="text-sm font-semibold text-teal-700 hover:underline">
                      №{row.id}
                    </Link>
                    {row.source === "landing" ? (
                      <span className="ml-1 rounded bg-indigo-100 px-1 py-0.5 text-[10px] font-semibold text-indigo-800">сайт</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{row.client_phone || "—"}</td>
                  <td className="px-4 py-3">{row.service || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(row.starts_at).toLocaleString("ru-RU")}</td>
                  <td className="max-w-[200px] px-4 py-3 text-xs text-slate-600">
                    <span className="line-clamp-2" title={row.comment || undefined}>
                      {row.comment?.trim() ? row.comment : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                        appointmentStatusBadgeClass(row.status),
                      ].join(" ")}
                    >
                      {statusBadgeText(row)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={statusSelectValue(row)}
                      disabled={updatingId === row.id}
                      onChange={(e) => void setAppointmentStatus(row, e.target.value as AppointmentStatus)}
                      className="h-9 w-full max-w-[11rem] rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium disabled:opacity-50"
                    >
                      {!isKnownAppointmentStatus(row.status) && row.status ? (
                        <option value={row.status}>{row.status} (в БД)</option>
                      ) : null}
                      {APPOINTMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {APPOINTMENT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
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
