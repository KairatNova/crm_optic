"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  appointmentStatusBadgeClass,
  APPOINTMENT_STATUS_LABELS,
  isKnownAppointmentStatus,
} from "@/lib/crm-appointment-filters";
import {
  createAppointment,
  createVisionTest,
  createVisit,
  deleteVisit,
  deleteVisionTest,
  getAppointments,
  getClientCard,
  patchClient,
  patchVisit,
  patchVisionTest,
  softDeleteAppointment,
  softDeleteClient,
  type AppointmentRead,
  type ClientRead,
  type VisitRead,
  type VisionTestRead,
} from "@/lib/crm-api";
import { CRM_BOOKING_SERVICE_OPTIONS } from "@/lib/crm-service-options";

type ActiveSection = "visits" | "vision" | "appointments";

export default function ClientCardPage() {
  const { token } = useCrmSession();
  const router = useRouter();
  const params = useParams<{ locale: string; id: string }>();
  const locale = params.locale || "ru";
  const clientId = Number(params.id);
  const [client, setClient] = useState<ClientRead | null>(null);
  const [visits, setVisits] = useState<VisitRead[]>([]);
  const [visionTests, setVisionTests] = useState<VisionTestRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visitComment, setVisitComment] = useState("");
  const [visitAt, setVisitAt] = useState("");

  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [editVisitAt, setEditVisitAt] = useState("");
  const [editVisitComment, setEditVisitComment] = useState("");

  const [testedAt, setTestedAt] = useState("");
  const [odSph, setOdSph] = useState("");
  const [odCyl, setOdCyl] = useState("");
  const [odAxis, setOdAxis] = useState("");
  const [osSph, setOsSph] = useState("");
  const [osCyl, setOsCyl] = useState("");
  const [osAxis, setOsAxis] = useState("");
  const [pd, setPd] = useState("");
  const [vaR, setVaR] = useState("");
  const [vaL, setVaL] = useState("");
  const [lensType, setLensType] = useState("");
  const [frameModel, setFrameModel] = useState("");
  const [vtComment, setVtComment] = useState("");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [birthMode, setBirthMode] = useState<"date" | "age">("date");
  const [birthAge, setBirthAge] = useState<string>("");

  const [editingVisionTestId, setEditingVisionTestId] = useState<number | null>(null);
  const [editVisionTestAt, setEditVisionTestAt] = useState("");
  const [editOdSph, setEditOdSph] = useState("");
  const [editOdCyl, setEditOdCyl] = useState("");
  const [editOdAxis, setEditOdAxis] = useState("");
  const [editOsSph, setEditOsSph] = useState("");
  const [editOsCyl, setEditOsCyl] = useState("");
  const [editOsAxis, setEditOsAxis] = useState("");
  const [editPd, setEditPd] = useState("");
  const [editVaR, setEditVaR] = useState("");
  const [editVaL, setEditVaL] = useState("");
  const [editLensType, setEditLensType] = useState("");
  const [editFrameModel, setEditFrameModel] = useState("");
  const [editVisionTestComment, setEditVisionTestComment] = useState("");
  const [activeSection, setActiveSection] = useState<ActiveSection>("visits");

  const [appointments, setAppointments] = useState<AppointmentRead[]>([]);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [nbApptStarts, setNbApptStarts] = useState("");
  const [nbApptService, setNbApptService] = useState(() => CRM_BOOKING_SERVICE_OPTIONS[0] ?? "");
  const [nbApptComment, setNbApptComment] = useState("");
  const [apptSubmitting, setApptSubmitting] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);

  function toDatetimeLocalValue(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    // Используем UTC-значение: достаточно для корректного редактирования в MVP.
    return d.toISOString().slice(0, 16);
  }

  function computeAgeFromBirthDate(bd: string | null | undefined): string {
    if (!bd) return "";
    const d = new Date(bd);
    if (Number.isNaN(d.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) {
      age -= 1;
    }
    return String(Math.max(0, age));
  }

  function ageToBirthDateLocal(age: number): string {
    const today = new Date();
    const birth = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
    const y = birth.getFullYear();
    const m = String(birth.getMonth() + 1).padStart(2, "0");
    const d = String(birth.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  async function loadData() {
    if (!clientId || Number.isNaN(clientId)) return;
    setLoading(true);
    setError(null);
    try {
      const [card, appts] = await Promise.all([
        getClientCard(token, clientId),
        getAppointments(token, { clientId }),
      ]);
      setClient(card.client);
      setVisits(card.visits);
      setVisionTests(card.vision_tests);
      setAppointments(
        appts.slice().sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
      );
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, token]);

  async function onAddVisit() {
    try {
      const created = await createVisit(token, clientId, {
        visited_at: visitAt ? new Date(visitAt).toISOString() : undefined,
        comment: visitComment.trim() || null,
      });

      setVisitAt("");
      setVisitComment("");
      setVisits((prev) => {
        const next = prev.filter((v) => v.id !== created.id);
        next.push(created);
        next.sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить визит");
    }
  }

  function startEditVisit(v: VisitRead) {
    setError(null);
    setEditingVisitId(v.id);
    setEditVisitAt(toDatetimeLocalValue(v.visited_at));
    setEditVisitComment(v.comment || "");
  }

  function cancelEditVisit() {
    setEditingVisitId(null);
    setEditVisitAt("");
    setEditVisitComment("");
  }

  async function saveEditVisit() {
    if (!editingVisitId) return;
    if (!editVisitAt) {
      setError("Укажите дату/время визита.");
      return;
    }

    try {
      const updated = await patchVisit(token, clientId, editingVisitId, {
        visited_at: new Date(editVisitAt).toISOString(),
        comment: editVisitComment.trim() || null,
      });

      cancelEditVisit();
      setVisits((prev) => {
        const next = prev.map((v) => (v.id === updated.id ? updated : v));
        next.sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить визит");
    }
  }

  async function onDeleteVisit(visitId: number) {
    if (!window.confirm("Удалить визит?")) return;
    try {
      await deleteVisit(token, clientId, visitId);
      if (editingVisitId === visitId) cancelEditVisit();
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить визит");
    }
  }

  async function onAddVisionTest() {
    try {
      const created = await createVisionTest(token, clientId, {
        tested_at: testedAt ? new Date(testedAt).toISOString() : undefined,
        od_sph: odSph || null,
        od_cyl: odCyl || null,
        od_axis: odAxis || null,
        os_sph: osSph || null,
        os_cyl: osCyl || null,
        os_axis: osAxis || null,
        pd: pd || null,
        va_r: vaR || null,
        va_l: vaL || null,
        lens_type: lensType || null,
        frame_model: frameModel || null,
        comment: vtComment || null,
      });
      setTestedAt("");
      setOdSph("");
      setOdCyl("");
      setOdAxis("");
      setOsSph("");
      setOsCyl("");
      setOsAxis("");
      setPd("");
      setVaR("");
      setVaL("");
      setLensType("");
      setFrameModel("");
      setVtComment("");

      // Обновляем состояние точечно, чтобы не перезапрашивать карточку целиком.
      setVisionTests((prev) => {
        const next = prev.filter((v) => v.id !== created.id);
        next.push(created);
        next.sort((a, b) => new Date(b.tested_at).getTime() - new Date(a.tested_at).getTime());
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить vision test");
    }
  }

  async function onDeleteVisionTest(visionTestId: number) {
    if (!window.confirm("Удалить тест зрения?")) return;
    try {
      setLoading(true);
      setError(null);
      await deleteVisionTest(token, clientId, visionTestId);
      cancelEditVisionTest();
      setVisionTests((prev) => prev.filter((v) => v.id !== visionTestId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить тест зрения");
    } finally {
      setLoading(false);
    }
  }

  function startEditProfile() {
    setError(null);
    if (!client) return;
    setEditName(client.name || "");
    setEditPhone(client.phone || "");
    setEditEmail(client.email || "");
    setEditGender(client.gender || "");
    setEditBirthDate(client.birth_date || "");
    setBirthMode("date");
    setBirthAge(computeAgeFromBirthDate(client.birth_date));
    setIsEditingProfile(true);
  }

  function cancelEditProfile() {
    setIsEditingProfile(false);
    setEditName("");
    setEditPhone("");
    setEditEmail("");
    setEditGender("");
    setEditBirthDate("");
    setBirthMode("date");
    setBirthAge("");
  }

  async function onAddAppointmentForClient() {
    if (!nbApptStarts.trim()) {
      toast.error("Укажите дату и время записи");
      return;
    }
    setApptSubmitting(true);
    setError(null);
    try {
      await createAppointment(token, {
        client_id: clientId,
        service: nbApptService || null,
        starts_at: new Date(nbApptStarts).toISOString(),
        comment: nbApptComment.trim() || null,
      });
      toast.success("Запись создана");
      setNbApptStarts("");
      setNbApptComment("");
      setNbApptService(CRM_BOOKING_SERVICE_OPTIONS[0] ?? "");
      setBookingFormOpen(false);
      const appts = await getAppointments(token, { clientId });
      setAppointments(
        appts.slice().sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось создать запись";
      setError(msg);
      toast.error(msg);
    } finally {
      setApptSubmitting(false);
    }
  }

  async function onSoftDeleteAppointment(apptId: number) {
    if (!window.confirm("Скрыть запись из списков? (мягкое удаление)")) return;
    try {
      await softDeleteAppointment(token, apptId);
      toast.success("Запись скрыта");
      setAppointments((prev) => prev.filter((a) => a.id !== apptId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось удалить запись";
      setError(msg);
      toast.error(msg);
    }
  }

  async function onSoftDeleteClientProfile() {
    if (
      !window.confirm(
        "Удалить клиента из CRM (мягкое удаление)? Карточка исчезнет из списков; связанные данные останутся в базе.",
      )
    ) {
      return;
    }
    setDeletingClient(true);
    setError(null);
    try {
      await softDeleteClient(token, clientId);
      toast.success("Клиент скрыт из списков");
      router.replace(`/${locale}/crm/clients`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось удалить клиента";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingClient(false);
    }
  }

  function appointmentStatusLabel(status: string | null | undefined): string {
    const s = status || "new";
    return isKnownAppointmentStatus(s) ? APPOINTMENT_STATUS_LABELS[s] : s;
  }

  async function saveEditProfile() {
    if (!client) return;
    setError(null);
    const name = editName.trim();
    const phone = editPhone.trim();
    if (!name || !phone) {
      setError("Имя и телефон обязательны.");
      return;
    }

    let birth_date: string | null = null;
    if (birthMode === "date") {
      birth_date = editBirthDate.trim() ? editBirthDate.trim() : null;
    } else {
      const ageNum = Number(birthAge);
      if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum) || ageNum < 0 || ageNum > 130) {
        setError("Введите возраст (целое число лет).");
        return;
      }
      birth_date = ageToBirthDateLocal(ageNum);
    }

    setLoading(true);
    try {
      const updated = await patchClient(token, client.id, {
        name,
        phone,
        email: editEmail.trim(),
        gender: editGender.trim(),
        birth_date,
      });
      setClient(updated);
      setIsEditingProfile(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить профиль");
    } finally {
      setLoading(false);
    }
  }

  function startEditVisionTest(vt: VisionTestRead) {
    setError(null);
    setEditingVisionTestId(vt.id);
    setEditVisionTestAt(toDatetimeLocalValue(vt.tested_at));
    setEditOdSph(vt.od_sph || "");
    setEditOdCyl(vt.od_cyl || "");
    setEditOdAxis(vt.od_axis || "");
    setEditOsSph(vt.os_sph || "");
    setEditOsCyl(vt.os_cyl || "");
    setEditOsAxis(vt.os_axis || "");
    setEditPd(vt.pd || "");
    setEditVaR(vt.va_r || "");
    setEditVaL(vt.va_l || "");
    setEditLensType(vt.lens_type || "");
    setEditFrameModel(vt.frame_model || "");
    setEditVisionTestComment(vt.comment || "");
  }

  function cancelEditVisionTest() {
    setEditingVisionTestId(null);
    setEditVisionTestAt("");
    setEditOdSph("");
    setEditOdCyl("");
    setEditOdAxis("");
    setEditOsSph("");
    setEditOsCyl("");
    setEditOsAxis("");
    setEditPd("");
    setEditVaR("");
    setEditVaL("");
    setEditLensType("");
    setEditFrameModel("");
    setEditVisionTestComment("");
  }

  async function saveEditVisionTest() {
    if (editingVisionTestId === null) return;
    if (!editVisionTestAt) {
      setError("Укажите дату/время теста зрения.");
      return;
    }

    setLoading(true);
    try {
      const updated = await patchVisionTest(token, clientId, editingVisionTestId, {
        tested_at: new Date(editVisionTestAt).toISOString(),
        od_sph: editOdSph,
        od_cyl: editOdCyl,
        od_axis: editOdAxis,
        os_sph: editOsSph,
        os_cyl: editOsCyl,
        os_axis: editOsAxis,
        pd: editPd,
        va_r: editVaR,
        va_l: editVaL,
        lens_type: editLensType,
        frame_model: editFrameModel,
        comment: editVisionTestComment,
      });
      cancelEditVisionTest();
      setVisionTests((prev) => {
        const next = prev.map((v) => (v.id === updated.id ? updated : v));
        next.sort((a, b) => new Date(b.tested_at).getTime() - new Date(a.tested_at).getTime());
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить тест зрения");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Card className="p-5 text-sm text-slate-600">Загрузка клиента...</Card>;
  }

  if (!client) {
    return <Card className="border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">Клиент не найден</Card>;
  }

  const lastVisionTest = visionTests[0] || null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CRM</div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Профиль клиента</h1>
            </div>
            {!isEditingProfile ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={startEditProfile}>Редактировать</Button>
                <Button variant="danger" disabled={deletingClient} onClick={() => void onSoftDeleteClientProfile()}>
                  {deletingClient ? "Удаление…" : "Удалить клиента"}
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>

        {!isEditingProfile ? (
          <CardContent>
          <div className="grid gap-1 text-sm text-slate-700">
            <div>
              <span className="font-semibold">Имя:</span> {client.name}
            </div>
            <div>
              <span className="font-semibold">Телефон:</span> {client.phone}
            </div>
            <div>
              <span className="font-semibold">Email:</span> {client.email || "—"}
            </div>
            <div>
              <span className="font-semibold">Пол:</span> {client.gender || "—"}
            </div>
            <div>
              <span className="font-semibold">Дата рождения:</span> {client.birth_date || "—"}
            </div>
            {lastVisionTest ? (
              <>
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <span className="font-semibold">Последний тест зрения:</span> {new Date(lastVisionTest.tested_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">OD:</span> {lastVisionTest.od_sph ?? "—"} / {lastVisionTest.od_cyl ?? "—"} /{" "}
                  {lastVisionTest.od_axis ?? "—"}
                </div>
                <div>
                  <span className="font-semibold">OS:</span> {lastVisionTest.os_sph ?? "—"} / {lastVisionTest.os_cyl ?? "—"} /{" "}
                  {lastVisionTest.os_axis ?? "—"}
                </div>
                <div>
                  <span className="font-semibold">PD:</span> {lastVisionTest.pd ?? "—"} · <span className="font-semibold">VA R:</span>{" "}
                  {lastVisionTest.va_r ?? "—"} · <span className="font-semibold">VA L:</span> {lastVisionTest.va_l ?? "—"}
                </div>
                {(lastVisionTest.lens_type || lastVisionTest.frame_model) && (
                  <div>
                    <span className="font-semibold">Линзы/оправа:</span>{" "}
                    {[lastVisionTest.lens_type ? `линзы: ${lastVisionTest.lens_type}` : null, lastVisionTest.frame_model ? `оправа: ${lastVisionTest.frame_model}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </>
            ) : null}
          </div>
          </CardContent>
        ) : (
          <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Имя</span>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Телефон</span>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Пол</span>
              <Input value={editGender} onChange={(e) => setEditGender(e.target.value)} placeholder="например: M/F" />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Дата рождения</span>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="radio" checked={birthMode === "date"} onChange={() => setBirthMode("date")} />
                  Дата
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="radio" checked={birthMode === "age"} onChange={() => setBirthMode("age")} />
                  Возраст
                </label>
              </div>
              <div className="mt-2">
                {birthMode === "date" ? (
                  <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
                ) : (
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={birthAge}
                    onChange={(e) => setBirthAge(e.target.value)}
                    placeholder="например: 32"
                    min={0}
                    max={130}
                  />
                )}
              </div>
            </label>

            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
              <Button variant="primary" disabled={loading} onClick={() => void saveEditProfile()}>
                {loading ? "Сохраняем..." : "Сохранить"}
              </Button>
              <Button variant="outline" disabled={loading} onClick={cancelEditProfile}>Отмена</Button>
            </div>
          </div>
          </CardContent>
        )}
      </Card>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <Card>
        <CardContent className="pt-4 sm:pt-5">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeSection === "visits" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveSection("visits")}
            >
              Визиты
            </Button>
            <Button
              variant={activeSection === "vision" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveSection("vision")}
            >
              Тесты зрения
            </Button>
            <Button
              variant={activeSection === "appointments" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveSection("appointments")}
            >
              Записи
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeSection === "appointments" ? (
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Записи на приём</h2>
                <p className="mt-1 text-xs text-slate-600">История и ссылки на карточки записей.</p>
              </div>
            </div>

            <div>
              <Button variant="outline" onClick={() => setBookingFormOpen((v) => !v)}>
                {bookingFormOpen ? "Скрыть форму записи" : "Записать на приём"}
              </Button>
            </div>

            {bookingFormOpen ? (
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-medium text-slate-600">Услуга</span>
                    <Select value={nbApptService} onChange={(e) => setNbApptService(e.target.value)}>
                      {CRM_BOOKING_SERVICE_OPTIONS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-medium text-slate-600">Дата и время</span>
                    <Input
                      type="datetime-local"
                      value={nbApptStarts}
                      onChange={(e) => setNbApptStarts(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Комментарий</span>
                    <Input
                      value={nbApptComment}
                      onChange={(e) => setNbApptComment(e.target.value)}
                      placeholder="Необязательно"
                    />
                  </label>
                </div>
                <Button variant="primary" disabled={apptSubmitting} onClick={() => void onAddAppointmentForClient()} className="mt-3">
                  {apptSubmitting ? "Создание…" : "Создать запись"}
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              {appointments.length === 0 ? (
                <div className="text-sm text-slate-500">Записей пока нет</div>
              ) : (
                appointments.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/${locale}/crm/appointments/${a.id}`}
                          className="font-semibold text-teal-700 hover:underline"
                        >
                          Запись №{a.id}
                        </Link>
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            appointmentStatusBadgeClass(a.status),
                          ].join(" ")}
                        >
                          {appointmentStatusLabel(a.status)}
                        </span>
                        {a.source === "landing" ? (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
                            сайт
                          </span>
                        ) : a.source === "crm" ? (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">CRM</span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-slate-700">{a.service || "—"}</div>
                      <div className="text-xs text-slate-500">{new Date(a.starts_at).toLocaleString("ru-RU")}</div>
                      {a.comment?.trim() ? (
                        <div className="mt-1 text-xs text-slate-600">{a.comment}</div>
                      ) : null}
                    </div>
                    <Button variant="danger" size="sm" onClick={() => void onSoftDeleteAppointment(a.id)} className="shrink-0">
                      Скрыть запись
                    </Button>
                  </div>
                ))
              )}
            </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "visits" ? (
      <Card>
        <CardContent className="pt-4 sm:pt-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Визиты</h2>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input type="datetime-local" value={visitAt} onChange={(e) => setVisitAt(e.target.value)} />
              <Input
                type="text"
                value={visitComment}
                onChange={(e) => setVisitComment(e.target.value)}
                placeholder="Комментарий к визиту"
                className="sm:col-span-2"
              />
            </div>

            <Button variant="primary" onClick={() => void onAddVisit()}>
              Добавить визит
            </Button>
          </div>

          <div className="space-y-2">
            {visits.length === 0 ? (
              <div className="text-sm text-slate-500">Визитов пока нет</div>
            ) : (
              visits.map((v) => (
                <div key={v.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  {editingVisitId === v.id ? (
                    <div className="space-y-2">
                      <Input type="datetime-local" value={editVisitAt} onChange={(e) => setEditVisitAt(e.target.value)} />
                      <Input
                        type="text"
                        value={editVisitComment}
                        onChange={(e) => setEditVisitComment(e.target.value)}
                        placeholder="Комментарий к визиту"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button variant="primary" onClick={() => void saveEditVisit()}>
                          Сохранить
                        </Button>
                        <Button variant="outline" onClick={cancelEditVisit}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{new Date(v.visited_at).toLocaleString()}</div>
                        <div className="text-slate-600">{v.comment || "Без комментария"}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEditVisit(v)}>
                          Редактировать
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => void onDeleteVisit(v.id)}>
                          Удалить
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        </CardContent>
      </Card>
      ) : null}

      {activeSection === "vision" ? (
      <Card>
        <CardContent className="pt-4 sm:pt-5">
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input type="datetime-local" value={testedAt} onChange={(e) => setTestedAt(e.target.value)} />
              <Input type="text" value={odSph} onChange={(e) => setOdSph(e.target.value)} placeholder="OD SPH" />
              <Input type="text" value={odCyl} onChange={(e) => setOdCyl(e.target.value)} placeholder="OD CYL" />
              <Input type="text" value={odAxis} onChange={(e) => setOdAxis(e.target.value)} placeholder="OD AXIS" />
              <Input type="text" value={osSph} onChange={(e) => setOsSph(e.target.value)} placeholder="OS SPH" />
              <Input type="text" value={osCyl} onChange={(e) => setOsCyl(e.target.value)} placeholder="OS CYL" />
              <Input type="text" value={osAxis} onChange={(e) => setOsAxis(e.target.value)} placeholder="OS AXIS" />
              <Input type="text" value={pd} onChange={(e) => setPd(e.target.value)} placeholder="PD" />
              <Input type="text" value={vaR} onChange={(e) => setVaR(e.target.value)} placeholder="VA прав." />
              <Input type="text" value={vaL} onChange={(e) => setVaL(e.target.value)} placeholder="VA лев." />
              <Input type="text" value={lensType} onChange={(e) => setLensType(e.target.value)} placeholder="Тип линз" />
              <Input type="text" value={frameModel} onChange={(e) => setFrameModel(e.target.value)} placeholder="Модель оправы" />
            </div>
            <Textarea
              value={vtComment}
              onChange={(e) => setVtComment(e.target.value)}
              placeholder="Комментарий к тесту зрения"
              className="min-h-20"
            />
            <Button variant="primary" onClick={() => void onAddVisionTest()}>
              Добавить тест зрения
            </Button>

            <div className="space-y-2">
              {visionTests.length === 0 ? (
                <div className="text-sm text-slate-500">Тестов зрения пока нет</div>
              ) : (
                visionTests.map((vt) => (
                  <div key={vt.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    {editingVisionTestId === vt.id ? (
                      <div className="space-y-3">
                        <Input
                          type="datetime-local"
                          value={editVisionTestAt}
                          onChange={(e) => setEditVisionTestAt(e.target.value)}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OD SPH</div>
                            <Input type="text" value={editOdSph} onChange={(e) => setEditOdSph(e.target.value)} placeholder="OD SPH" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OD CYL</div>
                            <Input type="text" value={editOdCyl} onChange={(e) => setEditOdCyl(e.target.value)} placeholder="OD CYL" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OD AXIS</div>
                            <Input type="text" value={editOdAxis} onChange={(e) => setEditOdAxis(e.target.value)} placeholder="OD AXIS" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OS SPH</div>
                            <Input type="text" value={editOsSph} onChange={(e) => setEditOsSph(e.target.value)} placeholder="OS SPH" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OS CYL</div>
                            <Input type="text" value={editOsCyl} onChange={(e) => setEditOsCyl(e.target.value)} placeholder="OS CYL" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OS AXIS</div>
                            <Input type="text" value={editOsAxis} onChange={(e) => setEditOsAxis(e.target.value)} placeholder="OS AXIS" />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <div className="text-[11px] text-slate-500">PD</div>
                            <Input type="text" value={editPd} onChange={(e) => setEditPd(e.target.value)} placeholder="PD" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">VA прав.</div>
                            <Input type="text" value={editVaR} onChange={(e) => setEditVaR(e.target.value)} placeholder="VA прав." />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">VA лев.</div>
                            <Input type="text" value={editVaL} onChange={(e) => setEditVaL(e.target.value)} placeholder="VA лев." />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">Тип линз</div>
                            <Input type="text" value={editLensType} onChange={(e) => setEditLensType(e.target.value)} placeholder="Тип линз" />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <div className="text-[11px] text-slate-500">Модель оправы</div>
                            <Input type="text" value={editFrameModel} onChange={(e) => setEditFrameModel(e.target.value)} placeholder="Модель оправы" />
                          </div>
                        </div>
                        <Textarea
                          value={editVisionTestComment}
                          onChange={(e) => setEditVisionTestComment(e.target.value)}
                          placeholder="Комментарий к тесту зрения"
                          className="min-h-20"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button variant="primary" onClick={() => void saveEditVisionTest()}>
                            Сохранить
                          </Button>
                          <Button variant="outline" onClick={cancelEditVisionTest}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold">{new Date(vt.tested_at).toLocaleString()}</div>
                        <div className="mt-1 text-slate-700">
                          OD: {vt.od_sph || "—"} / {vt.od_cyl || "—"} / {vt.od_axis || "—"} | OS: {vt.os_sph || "—"} /{" "}
                          {vt.os_cyl || "—"} / {vt.os_axis || "—"} | PD: {vt.pd || "—"} | VA R: {vt.va_r || "—"} | VA L:{" "}
                          {vt.va_l || "—"}
                        </div>
                        {(vt.lens_type || vt.frame_model) && (
                          <div className="mt-1 text-sm text-slate-600">
                            {vt.lens_type ? `Линзы: ${vt.lens_type}` : null}
                            {vt.lens_type && vt.frame_model ? " · " : null}
                            {vt.frame_model ? `Оправа: ${vt.frame_model}` : null}
                          </div>
                        )}
                        <div className="text-slate-600">{vt.comment || "Без комментария"}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEditVisionTest(vt)}>
                            Редактировать
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => void onDeleteVisionTest(vt.id)}>
                            Удалить
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}

