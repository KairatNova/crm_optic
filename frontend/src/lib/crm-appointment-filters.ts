import type { AppointmentStatus } from "@/lib/crm-api";

/** Как в `i18n/ru.ts` → `booking.form.serviceOptions`, плюс EN/тестовые алиасы. */
export type BoardServiceFilter = "all" | "vision_check" | "frames_lenses" | "contact_lenses" | "service_repair";

export const BOARD_SERVICE_FILTER_OPTIONS: { value: BoardServiceFilter; label: string }[] = [
  { value: "all", label: "Все услуги" },
  { value: "vision_check", label: "Проверка зрения" },
  { value: "frames_lenses", label: "Подбор оправ и линз" },
  { value: "contact_lenses", label: "Контактные линзы" },
  { value: "service_repair", label: "Сервис и ремонт" },
];

export function matchesBoardServiceFilter(service: string | null | undefined, filter: BoardServiceFilter): boolean {
  if (filter === "all") return true;
  const raw = (service || "").trim();
  if (!raw) return false;
  const t = raw.toLowerCase();
  switch (filter) {
    case "vision_check":
      return (
        t.includes("проверка зрения") ||
        t.includes("eye exam") ||
        t.includes("vision test") ||
        /^vision\b/i.test(raw)
      );
    case "frames_lenses":
      return (
        t.includes("подбор оправ") ||
        t.includes("оправ и линз") ||
        /frames\s*[&и]\s*lenses/i.test(raw) ||
        /frames\s+and\s+lenses/i.test(t) ||
        t.includes("frames & lenses")
      );
    case "contact_lenses":
      return t.includes("контактные линзы") || t.includes("contact lenses");
    case "service_repair":
      return (
        t.includes("сервис и ремонт") ||
        /service\s*[&и]\s*repair/i.test(raw) ||
        /service\s+and\s+repair/i.test(t)
      );
    default:
      return true;
  }
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "new",
  "confirmed",
  "in_progress",
  "done",
  "cancelled",
];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  new: "Новые",
  confirmed: "Подтверждённые",
  in_progress: "В работе",
  done: "Выполнено",
  cancelled: "Отменено",
};

export function isKnownAppointmentStatus(s: string | null | undefined): s is AppointmentStatus {
  return s != null && APPOINTMENT_STATUSES.includes(s as AppointmentStatus);
}

/** Классы бейджа статуса (таблица / карточки). */
export function appointmentStatusBadgeClass(status: string | null | undefined): string {
  const s = status || "new";
  if (!isKnownAppointmentStatus(s)) {
    return "bg-amber-100 text-amber-900";
  }
  switch (s) {
    case "new":
      return "bg-sky-100 text-sky-800";
    case "confirmed":
      return "bg-violet-100 text-violet-800";
    case "in_progress":
      return "bg-amber-100 text-amber-900";
    case "done":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}
