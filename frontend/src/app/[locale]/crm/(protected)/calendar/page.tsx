"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { AppointmentRead } from "@/lib/crm-api";
import { getAppointments, getClient } from "@/lib/crm-api";

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CrmCalendarPage() {
  const { token } = useCrmSession();
  const params = useParams<{ locale: string }>();
  const locale = params.locale || "ru";

  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [rows, setRows] = useState<AppointmentRead[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const appts = await getAppointments(token);
      setRows(appts);
      const ids = Array.from(new Set(appts.map((a) => a.client_id)));
      const pairs = await Promise.all(
        ids.map(async (id) => {
          try {
            const c = await getClient(token, id);
            return [id, c.name] as const;
          } catch {
            return [id, `Клиент #${id}`] as const;
          }
        }),
      );
      setNames(Object.fromEntries(pairs));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRead[]>();
    for (const d of weekDays) {
      map.set(dayKeyLocal(d), []);
    }
    for (const a of rows) {
      const k = dayKeyLocal(new Date(a.starts_at));
      if (!map.has(k)) continue;
      map.get(k)!.push(a);
    }
    for (const list of map.values()) {
      list.sort((x, y) => new Date(x.starts_at).getTime() - new Date(y.starts_at).getTime());
    }
    return map;
  }, [rows, weekDays]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Календарь</h1>
              <p className="mt-1 text-sm text-slate-600">Неделя записей по локальному времени браузера.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))}>
                ← Назад
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart(startOfWeekMonday(new Date()))}>
                Сегодня
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))}>
                Вперёд →
              </Button>
              <Button type="button" variant="primary" size="sm" disabled={loading} onClick={() => void load()}>
                {loading ? "…" : "Обновить"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 lg:grid-cols-7">
        {weekDays.map((d) => {
          const key = dayKeyLocal(d);
          const list = byDay.get(key) ?? [];
          const label = d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
          return (
            <Card key={key} className="min-h-[140px]">
              <CardHeader className="border-b border-slate-100 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                <div className="text-lg font-bold text-slate-900">{list.length}</div>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {list.length === 0 ? (
                  <p className="text-xs text-slate-400">Нет записей</p>
                ) : (
                  list.map((a) => (
                    <Link
                      key={a.id}
                      href={`/${locale}/crm/appointments/${a.id}`}
                      className="block rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs hover:bg-slate-100"
                    >
                      <div className="font-semibold text-slate-900">{new Date(a.starts_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="truncate text-slate-600">{names[a.client_id] || `Клиент #${a.client_id}`}</div>
                      <div className="truncate text-slate-500">{a.service || "—"}</div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
