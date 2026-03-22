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

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import {
  BOARD_SERVICE_FILTER_OPTIONS,
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

function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
    <div className={["flex w-[min(100%,280px)] shrink-0 flex-col rounded-2xl border-2 shadow-sm", theme.shell].join(" ")}>
      <div className={["border-b px-3 py-2", theme.header].join(" ")}>
        <div className={["text-sm font-bold", theme.headerTitle].join(" ")}>{title}</div>
        <div className={["text-xs", theme.headerMeta].join(" ")}>{recordsCountLabel(count)}</div>
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

function AppointmentCard({ row, locale }: { row: AppointmentRow; locale: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appt-${row.id}`,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const raw = row.status || "new";
  const unknown = raw !== "new" && !COLUMN_IDS.has(raw);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        "rounded-xl border border-slate-200/90 bg-white/95 p-3 text-sm shadow-sm backdrop-blur-sm",
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="font-semibold text-slate-900">
        <Link href={`/${locale}/crm/clients/${row.client_id}`} className="text-teal-700 hover:underline" onClick={(e) => e.stopPropagation()}>
          {row.client_name || `Клиент #${row.client_id}`}
        </Link>
      </div>
      <div className="mt-0.5 text-xs text-slate-500">{row.client_phone || "—"}</div>
      <div className="mt-1 text-xs text-slate-600">{row.service || "—"}</div>
      <div className="mt-1 text-xs text-slate-500">{new Date(row.starts_at).toLocaleString("ru-RU")}</div>
      {unknown ? (
        <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-800">Неизвестный статус в БД: {raw}</div>
      ) : null}
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const loadAppointments = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAppointments();
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
      const updated = await patchAppointment(token, apptId, { status: targetCol });
      setAppointments((prev) =>
        prev.map((r) => (r.id === apptId ? { ...r, ...updated, client_name: r.client_name, client_phone: r.client_phone } : r)),
      );
    } catch (e) {
      setAppointments(previous);
      setError(e instanceof Error ? e.message : "Не удалось изменить статус");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold">Доска</h1>
        <p className="mt-1 text-sm text-slate-600">
          Записи по статусам. Перетащите карточку в другую колонку, чтобы изменить статус.
        </p>

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
            <span className="text-xs font-medium text-slate-600">Статус записи</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="all">Все статусы</option>
              {KANBAN_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
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
            На доске: <span className="font-semibold text-slate-700">{filteredRows.length}</span> из {appointments.length}
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
          «Дата от» можно не заполнять — нижней границы не будет. «Дата до» изначально сегодня; очистите поле, чтобы убрать верхнюю границу.
        </p>
      </div>

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
                    <AppointmentCard key={row.id} row={row} locale={locale} />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}
