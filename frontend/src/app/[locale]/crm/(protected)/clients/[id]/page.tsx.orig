"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import {
  createVisionTest,
  createVisit,
  getClient,
  getVisionTests,
  getVisits,
  type ClientRead,
  type VisionTestRead,
  type VisitRead,
} from "@/lib/crm-api";

type Tab = "visits" | "vision";

export default function ClientCardPage() {
  const { token } = useCrmSession();
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);

  const [tab, setTab] = useState<Tab>("visits");
  const [client, setClient] = useState<ClientRead | null>(null);
  const [visits, setVisits] = useState<VisitRead[]>([]);
  const [visionTests, setVisionTests] = useState<VisionTestRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visitComment, setVisitComment] = useState("");
  const [visitAt, setVisitAt] = useState("");

  const [testedAt, setTestedAt] = useState("");
  const [odSph, setOdSph] = useState("");
  const [odCyl, setOdCyl] = useState("");
  const [odAxis, setOdAxis] = useState("");
  const [osSph, setOsSph] = useState("");
  const [osCyl, setOsCyl] = useState("");
  const [osAxis, setOsAxis] = useState("");
  const [pd, setPd] = useState("");
  const [vtComment, setVtComment] = useState("");

  async function loadData() {
    if (!clientId || Number.isNaN(clientId)) return;
    setLoading(true);
    setError(null);
    try {
      const [c, v, vt] = await Promise.all([getClient(token, clientId), getVisits(token, clientId), getVisionTests(token, clientId)]);
      setClient(c);
      setVisits(v);
      setVisionTests(vt);
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
      await createVisit(token, clientId, {
        comment: visitComment.trim() || null,
        visited_at: visitAt ? new Date(visitAt).toISOString() : undefined,
      });
      setVisitComment("");
      setVisitAt("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить визит");
    }
  }

  async function onAddVisionTest() {
    try {
      await createVisionTest(token, clientId, {
        tested_at: testedAt ? new Date(testedAt).toISOString() : undefined,
        od_sph: odSph || null,
        od_cyl: odCyl || null,
        od_axis: odAxis || null,
        os_sph: osSph || null,
        os_cyl: osCyl || null,
        os_axis: osAxis || null,
        pd: pd || null,
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
      setVtComment("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить vision test");
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Загрузка клиента...</div>;
  }

  if (!client) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">Клиент не найден</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Профиль клиента</h1>
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
            <span className="font-semibold">Дата рождения:</span> {client.birth_date || "—"}
          </div>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("visits")}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold",
              tab === "visits" ? "bg-teal-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            Visits
          </button>
          <button
            type="button"
            onClick={() => setTab("vision")}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold",
              tab === "vision" ? "bg-teal-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            Vision tests
          </button>
        </div>

        {tab === "visits" ? (
          <div className="space-y-4">
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
            <div className="space-y-2">
              {visits.length === 0 ? (
                <div className="text-sm text-slate-500">Визитов пока нет</div>
              ) : (
                visits.map((v) => (
                  <div key={v.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="font-semibold">{new Date(v.visited_at).toLocaleString()}</div>
                    <div className="text-slate-600">{v.comment || "Без комментария"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
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
            </div>
            <textarea
              value={vtComment}
              onChange={(e) => setVtComment(e.target.value)}
              placeholder="Комментарий к vision test"
              className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void onAddVisionTest()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Добавить vision test
            </button>

            <div className="space-y-2">
              {visionTests.length === 0 ? (
                <div className="text-sm text-slate-500">Vision tests пока нет</div>
              ) : (
                visionTests.map((vt) => (
                  <div key={vt.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="font-semibold">{new Date(vt.tested_at).toLocaleString()}</div>
                    <div className="mt-1 text-slate-700">
                      OD: {vt.od_sph || "—"} / {vt.od_cyl || "—"} / {vt.od_axis || "—"} | OS: {vt.os_sph || "—"} /{" "}
                      {vt.os_cyl || "—"} / {vt.os_axis || "—"} | PD: {vt.pd || "—"}
                    </div>
                    <div className="text-slate-600">{vt.comment || "Без комментария"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

