"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getAnalyticsSummary } from "@/lib/crm-api";

function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CrmAnalyticsPage() {
  const { token } = useCrmSession();
  const params = useParams<{ locale: string }>();
  const locale = params.locale || "ru";

  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [toDate, setToDate] = useState<string>(() => todayLocalDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null);

  const titleRange = useMemo(() => `${fromDate} → ${toDate}`, [fromDate, toDate]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await getAnalyticsSummary(token, { from: fromDate, to: toDate });
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки аналитики");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CRM</div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Аналитика и статистика</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={loading} onClick={() => void load()}>
                {loading ? "Загрузка…" : "Показать"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Период: от</span>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Период: до</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm">
              <div className="text-xs font-semibold text-slate-500">Текущий диапазон</div>
              <div className="mt-1 font-semibold text-slate-900">{titleRange}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">📊 1. Количество клиентов</div>
                <div className="mt-1 text-lg font-bold text-slate-900">Клиенты</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Всего клиентов</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{data ? data.total_clients : "—"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Новые за период</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{data ? data.new_clients : "—"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <div className="text-xs font-semibold text-slate-500">📅 2. Количество записей</div>
              <div className="mt-1 text-lg font-bold text-slate-900">Записи</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Записались (всего)</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{data ? data.appointments_total : "—"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Пришли (done)</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{data ? data.appointments_done : "—"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <div className="text-xs font-semibold text-slate-500">📈 3. Конверсия записей</div>
              <div className="mt-1 text-lg font-bold text-slate-900">Конверсия</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">Формула</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">пришли / записались × 100%</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div className="text-xs font-semibold text-slate-500">Записались</div>
                  <div className="font-bold text-slate-900">{data ? data.appointments_total : "—"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div className="text-xs font-semibold text-slate-500">Пришли</div>
                  <div className="font-bold text-slate-900">{data ? data.appointments_done : "—"}</div>
                </div>
                <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
                  <div className="text-xs font-semibold text-white/70">Конверсия</div>
                  <div className="text-xl font-extrabold">{data ? `${data.conversion_percent}%` : "—"}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <div className="text-xs font-semibold text-slate-500">🔝 4. Популярные услуги</div>
              <div className="mt-1 text-lg font-bold text-slate-900">Услуги</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.popular_services?.length ? (
                data.popular_services.map((s) => (
                  <div key={s.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <div className="font-semibold text-slate-900">{s.label}</div>
                    <div className="text-xs font-bold text-slate-700">{s.count}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">Нажмите «Показать», чтобы загрузить данные.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

