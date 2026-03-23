"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  BOARD_SERVICE_FILTER_OPTIONS,
  CRM_CANCELLATION_REASONS,
  appointmentStatusBadgeClass,
  isAppointmentOverdue,
  isKnownAppointmentStatus,
  matchesBoardServiceFilter,
  type BoardServiceFilter,
} from "@/lib/crm-appointment-filters";
import type { AppointmentRead, AppointmentStatus, ClientRead } from "@/lib/crm-api";
import {
  createAppointment,
  createClient,
  getAppointments,
  getClient,
  lookupClientByPhone,
  patchAppointment,
  softDeleteAppointment,
} from "@/lib/crm-api";
import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { CRM_BOOKING_SERVICE_OPTIONS } from "@/lib/crm-service-options";

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

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ApiStatusFilter = "all" | AppointmentStatus;

export default function CrmAppointmentsPage() {
  const { token } = useCrmSession();
  const params = useParams<{ locale: string }>();
  const locale = params.locale || "ru";
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [apiStatusFilter, setApiStatusFilter] = useState<ApiStatusFilter>("new");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>(() => todayLocalDate());
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<BoardServiceFilter>("all");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStarts, setEditStarts] = useState("");
  const [editService, setEditService] = useState("");

  const [cancelTarget, setCancelTarget] = useState<AppointmentRow | null>(null);
  const [cancelReasonCode, setCancelReasonCode] = useState("client_request");
  const [cancelReasonOther, setCancelReasonOther] = useState("");

  const [nbFormOpen, setNbFormOpen] = useState(false);
  const [nbPhone, setNbPhone] = useState("");
  const [nbLookup, setNbLookup] = useState<ClientRead | null>(null);
  const [nbLookupTried, setNbLookupTried] = useState(false);
  const [nbName, setNbName] = useState("");
  const [nbClientPhone, setNbClientPhone] = useState("");
  const [nbService, setNbService] = useState(() => CRM_BOOKING_SERVICE_OPTIONS[0] ?? "");
  const [nbStarts, setNbStarts] = useState("");
  const [nbSubmitting, setNbSubmitting] = useState(false);

  const loadAppointments = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (opts?.soft) setRefreshing(true);
      else setLoading(true);
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
        setAppointments(rows);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка загрузки";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiStatusFilter, token],
  );

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const refresh = useCallback(() => {
    void loadAppointments({ soft: true });
  }, [loadAppointments]);

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

  async function setAppointmentStatus(row: AppointmentRow, next: AppointmentStatus, cancellationReason?: string | null) {
    const current = row.status || "new";
    if (current === next) return;
    setUpdatingId(row.id);
    setError(null);
    const previous = appointments;
    setAppointments((prev) => prev.map((x) => (x.id === row.id ? { ...x, status: next } : x)));
    try {
      const body: Parameters<typeof patchAppointment>[2] = { status: next };
      if (next === "cancelled" && cancellationReason != null && cancellationReason !== "") {
        body.cancellation_reason = cancellationReason;
      }
      const updated = await patchAppointment(token, row.id, body);
      setAppointments((prev) =>
        prev.map((x) =>
          x.id === row.id ? { ...x, ...updated, client_name: x.client_name, client_phone: x.client_phone } : x,
        ),
      );
      toast.success("Статус обновлён");
    } catch (e) {
      setAppointments(previous);
      const msg = e instanceof Error ? e.message : "Не удалось обновить статус";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  function startEdit(row: AppointmentRow) {
    setEditingId(row.id);
    setEditStarts(toDatetimeLocalValue(row.starts_at));
    setEditService(row.service || "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveRowEdit(row: AppointmentRow) {
    setUpdatingId(row.id);
    setError(null);
    const previous = appointments;
    const startsIso = new Date(editStarts).toISOString();
    const svc = editService.trim() || null;
    setAppointments((prev) => prev.map((x) => (x.id === row.id ? { ...x, starts_at: startsIso, service: svc } : x)));
    try {
      const updated = await patchAppointment(token, row.id, {
        starts_at: startsIso,
        service: svc,
      });
      setAppointments((prev) =>
        prev.map((x) =>
          x.id === row.id ? { ...x, ...updated, client_name: x.client_name, client_phone: x.client_phone } : x,
        ),
      );
      setEditingId(null);
      toast.success("Запись сохранена");
    } catch (e) {
      setAppointments(previous);
      const msg = e instanceof Error ? e.message : "Не удалось сохранить";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  async function runClientLookup() {
    setNbLookupTried(true);
    setNbLookup(null);
    const p = nbPhone.trim();
    if (!p) {
      toast.message("Введите телефон для поиска");
      return;
    }
    try {
      const c = await lookupClientByPhone(token, p);
      setNbLookup(c);
      if (c) {
        setNbName(c.name);
        setNbClientPhone(c.phone);
        toast.success("Клиент найден");
      } else {
        setNbClientPhone(p);
        toast.message("Новый клиент — укажите имя и телефон");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка поиска");
    }
  }

  async function submitNewBooking() {
    if (!nbStarts.trim()) {
      toast.error("Укажите дату и время");
      return;
    }
    setNbSubmitting(true);
    setError(null);
    try {
      let clientId: number;
      if (nbLookup) {
        clientId = nbLookup.id;
      } else {
        const name = nbName.trim();
        const phone = nbClientPhone.trim();
        if (!name || !phone) {
          toast.error("Укажите имя и телефон или найдите клиента");
          setNbSubmitting(false);
          return;
        }
        const c = await createClient(token, { name, phone });
        clientId = c.id;
      }
      const appt = await createAppointment(token, {
        client_id: clientId,
        service: nbService.trim() || null,
        starts_at: new Date(nbStarts).toISOString(),
      });
      toast.success(`Запись №${appt.id} создана`);
      setNbPhone("");
      setNbLookup(null);
      setNbLookupTried(false);
      setNbName("");
      setNbClientPhone("");
      setNbService(CRM_BOOKING_SERVICE_OPTIONS[0] ?? "");
      setNbStarts("");
      await loadAppointments({ soft: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось создать запись";
      setError(msg);
      toast.error(msg);
    } finally {
      setNbSubmitting(false);
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

  function confirmCancel() {
    if (!cancelTarget) return;
    const reason =
      cancelReasonCode === "other" ? cancelReasonOther.trim() || "other" : cancelReasonCode;
    void setAppointmentStatus(cancelTarget, "cancelled", reason);
    setCancelTarget(null);
  }

  async function onSoftDeleteRow(row: AppointmentRow) {
    if (!window.confirm(`Скрыть запись №${row.id} из списков? (мягкое удаление)`)) return;
    setUpdatingId(row.id);
    setError(null);
    try {
      await softDeleteAppointment(token, row.id);
      toast.success("Запись скрыта");
      setAppointments((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось скрыть запись";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Записи</h1>
            <p className="mt-1 text-sm text-slate-600">Список записей, фильтры, правка времени и услуги в строке, новая запись.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || refreshing}
              onClick={() => refresh()}
              className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              {refreshing ? "Обновление…" : "Обновить"}
            </button>
            <Link
              href={`/${locale}/crm/board`}
              className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Доска
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setNbFormOpen((v) => !v)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {nbFormOpen ? "Скрыть форму новой записи" : "Новая запись (CRM)"}
          </button>
        </div>

        {nbFormOpen ? (
        <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
          <h2 className="text-sm font-bold text-teal-900">Новая запись (CRM)</h2>
          <p className="mt-1 text-xs text-teal-800/90">Поиск клиента по телефону; если не найден — создаётся новый клиент. Услуга — как на сайте.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Телефон для поиска</span>
              <div className="flex gap-2">
                <input
                  value={nbPhone}
                  onChange={(e) => {
                    setNbPhone(e.target.value);
                    setNbLookupTried(false);
                  }}
                  placeholder="+996…"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3"
                />
                <button
                  type="button"
                  onClick={() => void runClientLookup()}
                  className="h-10 shrink-0 rounded-xl border border-teal-600 bg-white px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                >
                  Найти
                </button>
              </div>
            </label>
            {nbLookup ? (
              <div className="sm:col-span-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm">
                <div className="text-xs font-medium text-slate-500">Найден клиент</div>
                <div className="font-semibold text-slate-900">{nbLookup.name}</div>
                <div className="text-slate-600">{nbLookup.phone}</div>
              </div>
            ) : nbLookupTried ? (
              <>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-medium text-slate-600">Имя (новый клиент)</span>
                  <input
                    value={nbName}
                    onChange={(e) => setNbName(e.target.value)}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-medium text-slate-600">Телефон</span>
                  <input
                    value={nbClientPhone}
                    onChange={(e) => setNbClientPhone(e.target.value)}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3"
                  />
                </label>
              </>
            ) : null}
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Услуга</span>
              <select
                value={nbService}
                onChange={(e) => setNbService(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3"
              >
                {CRM_BOOKING_SERVICE_OPTIONS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Дата и время</span>
              <input
                type="datetime-local"
                value={nbStarts}
                onChange={(e) => setNbStarts(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={nbSubmitting}
            onClick={() => void submitNewBooking()}
            className="mt-3 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {nbSubmitting ? "Создание…" : "Создать запись"}
          </button>
        </div>
        ) : null}

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

      {cancelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Закрыть"
            onClick={() => setCancelTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Причина отмены</h3>
            <p className="mt-1 text-sm text-slate-600">Запись №{cancelTarget.id}</p>
            <label className="mt-4 grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Причина</span>
              <select
                value={cancelReasonCode}
                onChange={(e) => setCancelReasonCode(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 px-3"
              >
                {CRM_CANCELLATION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            {cancelReasonCode === "other" ? (
              <textarea
                value={cancelReasonOther}
                onChange={(e) => setCancelReasonOther(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Опишите причину…"
              />
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => confirmCancel()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Отменить запись
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              <th className="min-w-[11rem] px-4 py-3">Изменить статус</th>
              <th className="px-4 py-3">Правка</th>
              <th className="px-4 py-3">Скрыть</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={10}>
                  Загрузка...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={10}>
                  Записей пока нет
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const overdue = isAppointmentOverdue(row);
                return (
                  <tr
                    key={row.id}
                    className={[
                      "border-t border-slate-100",
                      overdue ? "border-l-4 border-l-amber-500 bg-amber-50/30" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/${locale}/crm/clients/${row.client_id}`} className="text-teal-700 hover:underline">
                        {row.client_name || `Клиент #${row.client_id}`}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/${locale}/crm/appointments/${row.id}`} className="text-sm font-semibold text-teal-700 hover:underline">
                        №{row.id}
                      </Link>
                      {row.source === "landing" ? (
                        <span className="ml-1 rounded bg-indigo-100 px-1 py-0.5 text-[10px] font-semibold text-indigo-800">сайт</span>
                      ) : null}
                      {overdue ? (
                        <span className="ml-1 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">просрочено</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{row.client_phone || "—"}</td>
                    <td className="max-w-[12rem] px-4 py-3">
                      {editingId === row.id ? (
                        <input
                          value={editService}
                          onChange={(e) => setEditService(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        />
                      ) : (
                        row.service || "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {editingId === row.id ? (
                        <input
                          type="datetime-local"
                          value={editStarts}
                          onChange={(e) => setEditStarts(e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        />
                      ) : (
                        new Date(row.starts_at).toLocaleString("ru-RU")
                      )}
                    </td>
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
                      {row.status === "cancelled" && row.cancellation_reason ? (
                        <div className="mt-1 max-w-[10rem] text-[10px] text-slate-500" title={row.cancellation_reason}>
                          {row.cancellation_reason}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={statusSelectValue(row)}
                        disabled={updatingId === row.id}
                        onChange={(e) => {
                          const next = e.target.value as AppointmentStatus;
                          if (next === "cancelled") {
                            setCancelTarget(row);
                            setCancelReasonCode("client_request");
                            setCancelReasonOther("");
                            return;
                          }
                          void setAppointmentStatus(row, next);
                        }}
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
                    <td className="whitespace-nowrap px-4 py-3">
                      {editingId === row.id ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={updatingId === row.id}
                            onClick={() => void saveRowEdit(row)}
                            className="rounded-lg bg-teal-600 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === row.id}
                            onClick={cancelEdit}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingId === row.id}
                          onClick={() => startEdit(row)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Изменить
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={updatingId === row.id}
                        onClick={() => void onSoftDeleteRow(row)}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Скрыть
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
