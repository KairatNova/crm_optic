"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import {
  createVisionTest,
  createVisit,
  deleteVisit,
  deleteVisionTest,
  getClientCard,
  patchClient,
  patchVisit,
  patchVisionTest,
  type ClientRead,
  type VisitRead,
  type VisionTestRead,
} from "@/lib/crm-api";

type ActiveSection = "visits" | "vision";

export default function ClientCardPage() {
  const { token } = useCrmSession();
  const params = useParams<{ id: string }>();
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
      const card = await getClientCard(token, clientId);
      setClient(card.client);
      setVisits(card.visits);
      setVisionTests(card.vision_tests);
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
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Загрузка клиента...</div>;
  }

  if (!client) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">Клиент не найден</div>;
  }

  const lastVisionTest = visionTests[0] || null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-bold">Профиль клиента</h1>
          {!isEditingProfile ? (
            <button
              type="button"
              onClick={startEditProfile}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Редактировать
            </button>
          ) : null}
        </div>

        {!isEditingProfile ? (
          <div className="mt-3 grid gap-1 text-sm text-slate-700">
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
                <div className="mt-2 pt-2 border-t border-slate-200">
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
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Имя</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Телефон</span>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Пол</span>
              <input value={editGender} onChange={(e) => setEditGender(e.target.value)} placeholder="например: M/F" className="h-10 rounded-xl border border-slate-300 px-3" />
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
                  <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3 w-full" />
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={birthAge}
                    onChange={(e) => setBirthAge(e.target.value)}
                    placeholder="например: 32"
                    className="h-10 rounded-xl border border-slate-300 px-3 w-full"
                    min={0}
                    max={130}
                  />
                )}
              </div>
            </label>

            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => void saveEditProfile()}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-70"
              >
                {loading ? "Сохраняем..." : "Сохранить"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={cancelEditProfile}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("visits")}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold",
              activeSection === "visits" ? "bg-teal-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            Визиты
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("vision")}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold",
              activeSection === "vision" ? "bg-teal-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            Тесты зрения
          </button>
        </div>
      </div>

      {activeSection === "visits" ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Визиты</h2>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="datetime-local"
                value={visitAt}
                onChange={(e) => setVisitAt(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={visitComment}
                onChange={(e) => setVisitComment(e.target.value)}
                placeholder="Комментарий к визиту"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm sm:col-span-2"
              />
            </div>

            <button
              type="button"
              onClick={() => void onAddVisit()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Добавить визит
            </button>
          </div>

          <div className="space-y-2">
            {visits.length === 0 ? (
              <div className="text-sm text-slate-500">Визитов пока нет</div>
            ) : (
              visits.map((v) => (
                <div key={v.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  {editingVisitId === v.id ? (
                    <div className="space-y-2">
                      <input
                        type="datetime-local"
                        value={editVisitAt}
                        onChange={(e) => setEditVisitAt(e.target.value)}
                        className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                      />
                      <input
                        type="text"
                        value={editVisitComment}
                        onChange={(e) => setEditVisitComment(e.target.value)}
                        placeholder="Комментарий к визиту"
                        className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void saveEditVisit()}
                          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditVisit}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{new Date(v.visited_at).toLocaleString()}</div>
                        <div className="text-slate-600">{v.comment || "Без комментария"}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditVisit(v)}
                          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteVisit(v.id)}
                          className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      ) : null}

      {activeSection === "vision" ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="datetime-local"
                value={testedAt}
                onChange={(e) => setTestedAt(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={odSph}
                onChange={(e) => setOdSph(e.target.value)}
                placeholder="OD SPH"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={odCyl}
                onChange={(e) => setOdCyl(e.target.value)}
                placeholder="OD CYL"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={odAxis}
                onChange={(e) => setOdAxis(e.target.value)}
                placeholder="OD AXIS"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={osSph}
                onChange={(e) => setOsSph(e.target.value)}
                placeholder="OS SPH"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={osCyl}
                onChange={(e) => setOsCyl(e.target.value)}
                placeholder="OS CYL"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={osAxis}
                onChange={(e) => setOsAxis(e.target.value)}
                placeholder="OS AXIS"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={pd}
                onChange={(e) => setPd(e.target.value)}
                placeholder="PD"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={vaR}
                onChange={(e) => setVaR(e.target.value)}
                placeholder="VA прав."
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={vaL}
                onChange={(e) => setVaL(e.target.value)}
                placeholder="VA лев."
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={lensType}
                onChange={(e) => setLensType(e.target.value)}
                placeholder="Тип линз"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="text"
                value={frameModel}
                onChange={(e) => setFrameModel(e.target.value)}
                placeholder="Модель оправы"
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <textarea
              value={vtComment}
              onChange={(e) => setVtComment(e.target.value)}
              placeholder="Комментарий к тесту зрения"
              className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void onAddVisionTest()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Добавить тест зрения
            </button>

            <div className="space-y-2">
              {visionTests.length === 0 ? (
                <div className="text-sm text-slate-500">Тестов зрения пока нет</div>
              ) : (
                visionTests.map((vt) => (
                  <div key={vt.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    {editingVisionTestId === vt.id ? (
                      <div className="space-y-3">
                        <input
                          type="datetime-local"
                          value={editVisionTestAt}
                          onChange={(e) => setEditVisionTestAt(e.target.value)}
                          className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OD SPH</div>
                            <input
                              type="text"
                              value={editOdSph}
                              onChange={(e) => setEditOdSph(e.target.value)}
                              placeholder="OD SPH"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OD CYL</div>
                            <input
                              type="text"
                              value={editOdCyl}
                              onChange={(e) => setEditOdCyl(e.target.value)}
                              placeholder="OD CYL"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OD AXIS</div>
                            <input
                              type="text"
                              value={editOdAxis}
                              onChange={(e) => setEditOdAxis(e.target.value)}
                              placeholder="OD AXIS"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OS SPH</div>
                            <input
                              type="text"
                              value={editOsSph}
                              onChange={(e) => setEditOsSph(e.target.value)}
                              placeholder="OS SPH"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OS CYL</div>
                            <input
                              type="text"
                              value={editOsCyl}
                              onChange={(e) => setEditOsCyl(e.target.value)}
                              placeholder="OS CYL"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">OS AXIS</div>
                            <input
                              type="text"
                              value={editOsAxis}
                              onChange={(e) => setEditOsAxis(e.target.value)}
                              placeholder="OS AXIS"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <div className="text-[11px] text-slate-500">PD</div>
                            <input
                              type="text"
                              value={editPd}
                              onChange={(e) => setEditPd(e.target.value)}
                              placeholder="PD"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">VA прав.</div>
                            <input
                              type="text"
                              value={editVaR}
                              onChange={(e) => setEditVaR(e.target.value)}
                              placeholder="VA прав."
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">VA лев.</div>
                            <input
                              type="text"
                              value={editVaL}
                              onChange={(e) => setEditVaL(e.target.value)}
                              placeholder="VA лев."
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-500">Тип линз</div>
                            <input
                              type="text"
                              value={editLensType}
                              onChange={(e) => setEditLensType(e.target.value)}
                              placeholder="Тип линз"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <div className="text-[11px] text-slate-500">Модель оправы</div>
                            <input
                              type="text"
                              value={editFrameModel}
                              onChange={(e) => setEditFrameModel(e.target.value)}
                              placeholder="Модель оправы"
                              className="h-10 rounded-xl border border-slate-300 px-3 text-sm w-full"
                            />
                          </div>
                        </div>
                        <textarea
                          value={editVisionTestComment}
                          onChange={(e) => setEditVisionTestComment(e.target.value)}
                          placeholder="Комментарий к тесту зрения"
                          className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEditVisionTest()}
                            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditVisionTest}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Отмена
                          </button>
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
                          <button
                            type="button"
                            onClick={() => startEditVisionTest(vt)}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDeleteVisionTest(vt.id)}
                            className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
      </div>
      ) : null}
    </div>
  );
}

