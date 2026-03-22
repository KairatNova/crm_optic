"""Допустимые статусы записи (appointment) для CRM и Kanban."""

ALLOWED_APPOINTMENT_STATUSES: frozenset[str] = frozenset(
    {
        "new",
        "confirmed",
        "in_progress",
        "done",
        "cancelled",
    }
)
