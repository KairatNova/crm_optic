"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  BOARD_SERVICE_FILTER_OPTIONS,
  CRM_CANCELLATION_REASONS,
  isAppointmentOverdue,
  isPredefinedCancellationReason,
  matchesBoardServiceFilter,
  type BoardServiceFilter,
} from "@/lib/crm-appointment-filters";
import type { AppointmentRead, AppointmentStatus, ClientRead } from "@/lib/crm-api";
import { getAppointments, getClient, patchAppointment } from "@/lib/crm-api";

type AppointmentRow = AppointmentRead & {
  client_name?: string;
  client_phone?: string;
};

type ColumnTheme = {
  shell: string;
  header: string;
  headerTitle: string;
  headerMeta: string;
  dropZone: string;
  dropZoneOver: string;
};

const KANBAN_COLUMNS: { id: AppointmentStatus; title: string; theme: ColumnTheme }[] = [
  {
    id: "new",
    title: "Новые",
    theme: {
      shell: "border-sky-200 bg-sky-50/90",
      header: "border-sky-200/80 bg-sky-100/70",
      headerTitle: "text-sky-950",
      headerMeta: "text-sky-800/80",
      dropZone: "bg-sky-50/40",
      dropZoneOver: "bg-sky-100/80 ring-2 ring-inset ring-sky-300",
    },
  },
  {
    id: "confirmed",
    title: "Подтверждённые",
    theme: {
      shell: "border-violet-200 bg-violet-50/90",
      header: "border-violet-200/80 bg-violet-100/70",
      headerTitle: "text-violet-950",
      headerMeta: "text-violet-800/80",
      dropZone: "bg-violet-50/40",
      dropZoneOver: "bg-violet-100/80 ring-2 ring-inset ring-violet-300",
    },
  },
  {
    id: "in_progress",
    title: "В работе",
    theme: {
      shell: "border-amber-200 bg-amber-50/90",
      header: "border-amber-200/80 bg-amber-100/70",
      headerTitle: "text-amber-950",
      headerMeta: "text-amber-900/80",
      dropZone: "bg-amber-50/40",
      dropZoneOver: "bg-amber-100/80 ring-2 ring-inset ring-amber-300",
    },
  },
  {
    id: "done",
    title: "Выполнено",
    theme: {
      shell: "border-emerald-200 bg-emerald-50/90",
      header: "border-emerald-200/80 bg-emerald-100/70",
      headerTitle: "text-emerald-950",
      headerMeta: "text-emerald-800/80",
      dropZone: "bg-emerald-50/40",
      dropZoneOver: "bg-emerald-100/80 ring-2 ring-inset ring-emerald-300",
    },
  },
  {
    id: "cancelled",
    title: "Отменено",
    theme: {
      shell: "border-rose-200 bg-rose-50/90",
      header: "border-rose-200/80 bg-rose-100/70",
      headerTitle: "text-rose-950",
      headerMeta: "text-rose-800/80",
      dropZone: "bg-rose-50/40",
      dropZoneOver: "bg-rose-100/80 ring-2 ring-inset ring-rose-300",
    },
  },
];

const COLUMN_IDS = new Set<string>(KANBAN_COLUMNS.map((c) => c.id));

function sortByStartsAtAsc(rows: AppointmentRow[]): AppointmentRow[] {
  return [...rows].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

function recordsCountLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} запись`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} записи`;
  return `${n} записей`;
}

function boardColumnForStatus(status: string | null | undefined): AppointmentStatus {
  const s = status || "new";
  if (COLUMN_IDS.has(s)) return s as AppointmentStatus;
  return "new";
}

function resolveDropColumn(overId: string | null | undefined, rows: AppointmentRow[]): AppointmentStatus | null {
  if (overId == null) return null;
  const sid = String(overId);
  if (COLUMN_IDS.has(sid)) return sid as AppointmentStatus;
  if (sid.startsWith("appt-")) {
    const id = Number(sid.replace(/^appt-/, ""));
    if (Number.isNaN(id)) return null;
    const row = rows.find((r) => r.id === id);
    if (!row) return null;
    return boardColumnForStatus(row.status);
  }
  return null;
}

function KanbanColumn({
  columnId,
  title,
  count,
  theme,
  children,
}: {
  columnId: AppointmentStatus;
  title: string;
  count: number;
  theme: ColumnTheme;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div className={["flex w-[min(100%,280px)] shrink-0 flex-col rounded-2xl border shadow-sm", theme.shell].join(" ")}>
      <div className={["border-b px-3 py-2.5", theme.header].join(" ")}>
        <div className={["text-sm font-bold", theme.headerTitle].join(" ")}>{title}</div>
        <div className={["text-xs font-medium", theme.headerMeta].join(" ")}>{recordsCountLabel(count)}</div>
      </div>
      <div
        ref={setNodeRef}
        className={[
          "min-h-[140px] flex-1 space-y-2 overflow-y-auto p-2",
          theme.dropZone,
          isOver ? theme.dropZoneOver : "",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function AppointmentCard({
  row,
  locale,
  onOpen,
}: {
  row: AppointmentRow;
  locale: string;
  onOpen: (row: AppointmentRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appt-${row.id}`,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const raw = row.status || "new";
  const unknown = raw !== "new" && !COLUMN_IDS.has(raw);
  const overdue = isAppointmentOverdue(row);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm",
        isDragging ? "opacity-60" : "",
        overdue ? "border-amber-400/90 bg-amber-50/40 ring-1 ring-amber-200/80" : "",
      ].join(" ")}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-2 text-slate-500 hover:bg-slate-100 active:cursor-grabbing"
          aria-label="Перетащить карточку"
          {...listeners}
          {...attributes}
        >
          <span className="flex flex-col gap-0.5 leading-none" aria-hidden>
            <span className="h-0.5 w-3 rounded bg-slate-400" />
            <span className="h-0.5 w-3 rounded bg-slate-400" />
            <span className="h-0.5 w-3 rounded bg-slate-400" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div
            role="button"
            tabIndex={0}
            className="cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            onClick={() => onOpen(row)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(row);
              }
            }}
          >
            <div className="font-semibold text-slate-900">
              <span className="text-teal-700">
                {row.client_name || `Клиент #${row.client_id}`}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">{row.client_phone || "—"}</div>
            <div className="mt-1 text-xs text-slate-600">{row.service || "—"}</div>
            <div className="mt-1 text-xs text-slate-500">{new Date(row.starts_at).toLocaleString("ru-RU")}</div>
            {overdue ? (
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Просрочено</div>
            ) : null}
            {row.source === "landing" ? (
              <div className="mt-1 text-[10px] font-semibold text-indigo-700">Лендинг</div>
            ) : null}
            {unknown ? (
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                Неизвестный статус в БД: {raw}
              </div>
            ) : null}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <Link
              href={`/${locale}/crm/clients/${row.client_id}`}
              className="text-xs font-semibold text-teal-700 hover:underline"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              Клиент →
            </Link>
            <span className="mx-2 text-slate-300">·</span>
            <Link
              href={`/${locale}/crm/appointments/${row.id}`}
              className="text-xs font-semibold text-teal-700 hover:underline"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              Запись →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

type StatusFilterValue = "all" | AppointmentStatus;

export default function CrmBoardPage() {
  const { token } = useCrmSession();
  const params = useParams<{ locale: string }>();
  const locale = params.locale || "ru";

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [serviceFilter, setServiceFilter] = useState<BoardServiceFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const [selectedRow, setSelectedRow] = useState<AppointmentRow | null>(null);
  const [panelStatus, setPanelStatus] = useState<AppointmentStatus>("new");
  const [panelReasonCode, setPanelReasonCode] = useState("client_request");
  const [panelReasonOther, setPanelReasonOther] = useState("");
  const [panelSaving, setPanelSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const loadAppointments = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const appts = await getAppointments(token);
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
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const refresh = useCallback(async () => {
    await loadAppointments({ soft: true });
  }, [loadAppointments]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (!selectedRow) return;
    setPanelStatus(boardColumnForStatus(selectedRow.status));
    const cr = selectedRow.cancellation_reason;
    if (cr && isPredefinedCancellationReason(cr)) {
      setPanelReasonCode(cr);
      setPanelReasonOther("");
    } else if (cr) {
      setPanelReasonCode("other");
      setPanelReasonOther(cr);
    } else {
      setPanelReasonCode("client_request");
      setPanelReasonOther("");
    }
  }, [selectedRow]);

  useEffect(() => {
    if (!selectedRow) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedRow(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedRow]);

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

    if (statusFilter !== "all") {
      rows = rows.filter((a) => boardColumnForStatus(a.status) === statusFilter);
    }

    if (serviceFilter !== "all") {
      rows = rows.filter((a) => matchesBoardServiceFilter(a.service, serviceFilter));
    }

    return rows;
  }, [appointments, fromDate, toDate, searchQuery, statusFilter, serviceFilter]);

  const byColumn = useMemo(() => {
    const map = new Map<AppointmentStatus, AppointmentRow[]>();
    for (const col of KANBAN_COLUMNS) {
      map.set(col.id, []);
    }
    for (const a of filteredRows) {
      const col = boardColumnForStatus(a.status);
      map.get(col)!.push(a);
    }
    for (const col of KANBAN_COLUMNS) {
      map.set(col.id, sortByStartsAtAsc(map.get(col.id)!));
    }
    return map;
  }, [filteredRows]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeId = String(active.id);
    if (!activeId.startsWith("appt-")) return;
    const apptId = Number(activeId.replace(/^appt-/, ""));
    if (Number.isNaN(apptId)) return;

    const targetCol = resolveDropColumn(over?.id != null ? String(over.id) : null, filteredRows);
    if (!targetCol) return;

    const row = appointments.find((r) => r.id === apptId);
    if (!row) return;
    if (row.status === targetCol) return;

    const previous = appointments;
    setAppointments((prev) => prev.map((r) => (r.id === apptId ? { ...r, status: targetCol } : r)));
    setError(null);
    try {
      const patch: Parameters<typeof patchAppointment>[2] = { status: targetCol };
      if (targetCol === "cancelled") {
        patch.cancellation_reason = "client_request";
      }
      const updated = await patchAppointment(token, apptId, patch);
      setAppointments((prev) =>
        prev.map((r) => (r.id === apptId ? { ...r, ...updated, client_name: r.client_name, client_phone: r.client_phone } : r)),
      );
      toast.success("Статус обновлён");
    } catch (e) {
      setAppointments(previous);
      const msg = e instanceof Error ? e.message : "Не удалось изменить статус";
      setError(msg);
      toast.error(msg);
    }
  }

  async function applyPanelStatus() {
    if (!selectedRow) return;
    setPanelSaving(true);
    setError(null);
    try {
      const body: Parameters<typeof patchAppointment>[2] = { status: panelStatus };
      if (panelStatus === "cancelled") {
        body.cancellation_reason =
          panelReasonCode === "other" ? panelReasonOther.trim() || null : panelReasonCode;
      }
      const updated = await patchAppointment(token, selectedRow.id, body);
      setAppointments((prev) =>
        prev.map((r) =>
          r.id === selectedRow.id ? { ...r, ...updated, client_name: r.client_name, client_phone: r.client_phone } : r,
        ),
      );
      setSelectedRow((cur) =>
        cur && cur.id === selectedRow.id
          ? { ...cur, ...updated, client_name: cur.client_name, client_phone: cur.client_phone }
          : cur,
      );
      toast.success("Статус сохранён");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось сохранить";
      setError(msg);
      toast.error(msg);
    } finally {
      setPanelSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CRM</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Kanban</h1>
            <p className="mt-1 text-sm text-slate-600">
              Записи по статусам. Перетащите карточку за ручку слева; клик по карточке открывает панель.
            </p>
          </div>
          <Button variant="primary" disabled={loading || refreshing} onClick={() => void refresh()}>
            {refreshing ? "Обновление…" : "Обновить"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Всего (загружено)</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{appointments.length}</div>
            <div className="mt-1 text-xs text-slate-500">Записей в памяти</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">На доске</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{filteredRows.length}</div>
            <div className="mt-1 text-xs text-slate-500">С учётом фильтров</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
            <div className="text-xs font-semibold text-amber-700">Просрочено</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{filteredRows.filter(isAppointmentOverdue).length}</div>
            <div className="mt-1 text-xs text-amber-800/80">Не done/cancelled</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Выбранный статус</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{statusFilter === "all" ? "Все" : statusFilter}</div>
            <div className="mt-1 text-xs text-slate-500">Локальный фильтр</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="grid gap-1 text-sm sm:col-span-2 lg:col-span-2">
            <span className="text-xs font-medium text-slate-600">Поиск</span>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Имя, телефон, услуга, комментарий…"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Статус записи</span>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}>
              <option value="all">Все статусы</option>
              {KANBAN_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Услуга</span>
            <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value as BoardServiceFilter)}>
              {BOARD_SERVICE_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
          <div className="text-xs text-slate-500 sm:col-span-2 lg:col-span-2 lg:self-end">
            На доске: <span className="font-semibold text-slate-700">{filteredRows.length}</span> из {appointments.length}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Дата от (необязательно)</span>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Дата до (по умолчанию — сегодня)</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          «Дата от» можно не заполнять — нижней границы не будет. «Дата до» изначально сегодня; очистите поле, чтобы убрать верхнюю границу.
        </p>
        </CardHeader>
      </Card>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Загрузка…</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map((col) => {
              const items = byColumn.get(col.id) ?? [];
              return (
                <KanbanColumn key={col.id} columnId={col.id} title={col.title} count={items.length} theme={col.theme}>
                  {items.map((row) => (
                    <AppointmentCard key={row.id} row={row} locale={locale} onOpen={setSelectedRow} />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        </DndContext>
      )}

      {selectedRow ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
            aria-label="Закрыть панель"
            onClick={() => setSelectedRow(null)}
          />
          <aside className="relative z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Запись</div>
                <div className="text-lg font-bold text-slate-900">№{selectedRow.id}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Закрыть
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
              <div>
                <div className="text-xs font-medium text-slate-500">Клиент</div>
                <Link
                  href={`/${locale}/crm/clients/${selectedRow.client_id}`}
                  className="mt-0.5 font-semibold text-teal-700 hover:underline"
                >
                  {selectedRow.client_name || `Клиент #${selectedRow.client_id}`}
                </Link>
                <div className="text-slate-600">{selectedRow.client_phone || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Услуга</div>
                <div className="text-slate-900">{selectedRow.service || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Время</div>
                <div className="text-slate-900">{new Date(selectedRow.starts_at).toLocaleString("ru-RU")}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Комментарий</div>
                <div className="whitespace-pre-wrap text-slate-800">{selectedRow.comment?.trim() ? selectedRow.comment : "—"}</div>
              </div>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Статус</span>
                <select
                  value={panelStatus}
                  onChange={(e) => setPanelStatus(e.target.value as AppointmentStatus)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3"
                >
                  {KANBAN_COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              {panelStatus === "cancelled" ? (
                <div className="space-y-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-600">Причина отмены</span>
                    <select
                      value={panelReasonCode}
                      onChange={(e) => setPanelReasonCode(e.target.value)}
                      className="h-10 rounded-xl border border-slate-300 bg-white px-3"
                    >
                      {CRM_CANCELLATION_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {panelReasonCode === "other" ? (
                    <textarea
                      value={panelReasonOther}
                      onChange={(e) => setPanelReasonOther(e.target.value)}
                      rows={2}
                      placeholder="Уточните причину…"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={panelSaving}
                  onClick={() => void applyPanelStatus()}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {panelSaving ? "Сохранение…" : "Сохранить статус"}
                </button>
                <Link
                  href={`/${locale}/crm/appointments/${selectedRow.id}`}
                  className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Полная карточка
                </Link>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
