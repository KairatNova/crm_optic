"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  CRM_CANCELLATION_REASONS,
  isKnownAppointmentStatus,
  isPredefinedCancellationReason,
} from "@/lib/crm-appointment-filters";
import type { AppointmentDetailRead, AppointmentStatus } from "@/lib/crm-api";
import { getAppointmentDetail, patchAppointment, softDeleteAppointment } from "@/lib/crm-api";
import { CRM_BOOKING_SERVICE_OPTIONS } from "@/lib/crm-service-options";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sourceLabel(source: string | null | undefined): { text: string; className: string } {
  if (source === "landing") {
    return { text: "Запись с лендинга", className: "bg-indigo-100 text-indigo-900" };
  }
  if (source === "crm") {
    return { text: "Создано в CRM", className: "bg-slate-200 text-slate-800" };
  }
  return { text: "Источник не указан", className: "bg-amber-50 text-amber-900" };
}

export default function AppointmentDetailPage() {
  const { token } = useCrmSession();
  const router = useRouter();
  const params = useParams<{ locale: string; id: string }>();
  const locale = params.locale || "ru";
  const appointmentId = Number(params.id);

  const [detail, setDetail] = useState<AppointmentDetailRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editService, setEditService] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editStatus, setEditStatus] = useState<AppointmentStatus>("new");
  const [editComment, setEditComment] = useState("");
  const [editCancelReasonCode, setEditCancelReasonCode] = useState("client_request");
  const [editCancelReasonOther, setEditCancelReasonOther] = useState("");

  const load = useCallback(async () => {
    if (Number.isNaN(appointmentId)) {
      setError("Некорректный номер записи");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await getAppointmentDetail(token, appointmentId);
      setDetail(d);
      setEditService(d.service || "");
      setEditStartsAt(toDatetimeLocalValue(d.starts_at));
      setEditStatus(isKnownAppointmentStatus(d.status) ? d.status : "new");
      setEditComment(d.comment || "");
      const cr = d.cancellation_reason;
      if (cr && isPredefinedCancellationReason(cr)) {
        setEditCancelReasonCode(cr);
        setEditCancelReasonOther("");
      } else if (cr) {
        setEditCancelReasonCode("other");
        setEditCancelReasonOther(cr);
      } else {
        setEditCancelReasonCode("client_request");
        setEditCancelReasonOther("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить запись");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [token, appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!detail || Number.isNaN(appointmentId)) return;
    setSaving(true);
    setError(null);
    try {
      const startsIso = new Date(editStartsAt).toISOString();
      const patchBody: Parameters<typeof patchAppointment>[2] = {
        service: editService.trim() || null,
        starts_at: startsIso,
        status: editStatus,
        comment: editComment.trim() || null,
      };
      if (editStatus === "cancelled") {
        patchBody.cancellation_reason =
          editCancelReasonCode === "other" ? editCancelReasonOther.trim() || null : editCancelReasonCode;
      }
      const updated = await patchAppointment(token, appointmentId, patchBody);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              client: prev.client,
            }
          : null,
      );
      toast.success("Изменения сохранены");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось сохранить";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const servicePresetValue = CRM_BOOKING_SERVICE_OPTIONS.includes(editService) ? editService : "__custom__";

  async function onSoftDeleteDetail() {
    if (!window.confirm("Скрыть эту запись из списков CRM? (мягкое удаление)")) return;
    if (Number.isNaN(appointmentId)) return;
    setDeleting(true);
    setError(null);
    try {
      await softDeleteAppointment(token, appointmentId);
      toast.success("Запись скрыта");
      router.replace(`/${locale}/crm`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось скрыть запись";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  const src = sourceLabel(detail?.source);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Link href={`/${locale}/crm`} className="text-teal-700 hover:underline">
          ← Записи (список)
        </Link>
        <span className="text-slate-300">|</span>
        <Link href={`/${locale}/crm/board`} className="text-teal-700 hover:underline">
          Доска
        </Link>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      {loading ? (
        <Card className="p-8 text-center text-slate-500">Загрузка…</Card>
      ) : detail ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CRM</div>
                  <span className="text-slate-300">/</span>
                  <h1 className="text-xl font-bold text-slate-900">Запись №{detail.id}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${src.className}`}>{src.text}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Создана: {new Date(detail.created_at).toLocaleString("ru-RU")}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-medium text-slate-600">Услуга</span>
                  <Select
                    value={servicePresetValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__custom__") setEditService("");
                      else setEditService(v);
                    }}
                  >
                    {CRM_BOOKING_SERVICE_OPTIONS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                    <option value="__custom__">Другое (вручную)</option>
                  </Select>
                  {servicePresetValue === "__custom__" ? (
                    <Input
                      value={editService}
                      onChange={(e) => setEditService(e.target.value)}
                      className="mt-2"
                      placeholder="Название услуги"
                    />
                  ) : null}
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-medium text-slate-600">Дата и время</span>
                  <Input type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-medium text-slate-600">Статус</span>
                  <Select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AppointmentStatus)}
                  >
                    {APPOINTMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {APPOINTMENT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </label>
                {editStatus === "cancelled" ? (
                  <div className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                    <div className="text-xs font-medium text-rose-900">Причина отмены</div>
                    <Select
                      value={editCancelReasonCode}
                      onChange={(e) => setEditCancelReasonCode(e.target.value)}
                    >
                      {CRM_CANCELLATION_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                    {editCancelReasonCode === "other" ? (
                      <Textarea
                        value={editCancelReasonOther}
                        onChange={(e) => setEditCancelReasonOther(e.target.value)}
                        rows={2}
                        placeholder="Уточнение…"
                      />
                    ) : null}
                  </div>
                ) : null}
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-medium text-slate-600">Комментарий</span>
                  <Textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={4}
                    placeholder="Комментарий к записи…"
                  />
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="primary" disabled={saving} onClick={() => void onSave()}>
                    {saving ? "Сохранение…" : "Сохранить изменения"}
                  </Button>
                  <Button variant="danger" disabled={deleting || saving} onClick={() => void onSoftDeleteDetail()}>
                    {deleting ? "Скрытие…" : "Скрыть запись"}
                  </Button>
                </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-1">
            <CardHeader>
              <h2 className="text-lg font-bold text-slate-900">Профиль клиента</h2>
              <p className="mt-1 text-xs text-slate-500">Данные на момент открытия страницы.</p>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Имя</dt>
                <dd className="font-medium text-slate-900">{detail.client.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Телефон</dt>
                <dd className="text-slate-800">{detail.client.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Email</dt>
                <dd className="text-slate-800">{detail.client.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Пол</dt>
                <dd className="text-slate-800">{detail.client.gender || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Дата рождения</dt>
                <dd className="text-slate-800">
                  {detail.client.birth_date ? new Date(detail.client.birth_date).toLocaleDateString("ru-RU") : "—"}
                </dd>
              </div>
              </dl>
              <Link href={`/${locale}/crm/clients/${detail.client_id}`} className="mt-5 inline-flex w-full">
                <Button variant="outline" className="w-full">
                  Открыть карточку клиента
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
