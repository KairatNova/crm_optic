"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useCrmSession } from "@/components/crm/CrmProtectedShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getOwnerLandingContent, putOwnerLandingContent } from "@/lib/crm-api";
import type { Locale } from "@/i18n/locales";
import { LOCALES } from "@/i18n/locales";

type FormState = {
  brand: string;
  phone: string;
  city: string;
  heroBadge: string;
  heroTitle1: string;
  heroTitle2: string;
  heroSubtitle: string;
  highlightsTitle: string;
  contactTitle: string;
  contactAddress: string;
  contactHours: string;
  contactMapHint: string;
};

function payloadToForm(p: Record<string, unknown>): FormState {
  const hero = p.hero && typeof p.hero === "object" && p.hero !== null ? (p.hero as Record<string, unknown>) : {};
  const contact =
    p.contact && typeof p.contact === "object" && p.contact !== null ? (p.contact as Record<string, unknown>) : {};
  const highlights =
    p.highlights && typeof p.highlights === "object" && p.highlights !== null
      ? (p.highlights as Record<string, unknown>)
      : {};
  return {
    brand: typeof p.brand === "string" ? p.brand : "",
    phone: typeof p.phone === "string" ? p.phone : "",
    city: typeof p.city === "string" ? p.city : "",
    heroBadge: typeof hero.badge === "string" ? hero.badge : "",
    heroTitle1: typeof hero.title1 === "string" ? hero.title1 : "",
    heroTitle2: typeof hero.title2 === "string" ? hero.title2 : "",
    heroSubtitle: typeof hero.subtitle === "string" ? hero.subtitle : "",
    highlightsTitle: typeof highlights.title === "string" ? highlights.title : "",
    contactTitle: typeof contact.title === "string" ? contact.title : "",
    contactAddress: typeof contact.address === "string" ? contact.address : "",
    contactHours: typeof contact.hours === "string" ? contact.hours : "",
    contactMapHint: typeof contact.mapHint === "string" ? contact.mapHint : "",
  };
}

function formToPayload(f: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (f.brand.trim()) payload.brand = f.brand.trim();
  if (f.phone.trim()) payload.phone = f.phone.trim();
  if (f.city.trim()) payload.city = f.city.trim();
  const hero: Record<string, string> = {};
  if (f.heroBadge.trim()) hero.badge = f.heroBadge.trim();
  if (f.heroTitle1.trim()) hero.title1 = f.heroTitle1.trim();
  if (f.heroTitle2.trim()) hero.title2 = f.heroTitle2.trim();
  if (f.heroSubtitle.trim()) hero.subtitle = f.heroSubtitle.trim();
  if (Object.keys(hero).length) payload.hero = hero;
  if (f.highlightsTitle.trim()) payload.highlights = { title: f.highlightsTitle.trim() };
  const contact: Record<string, string> = {};
  if (f.contactTitle.trim()) contact.title = f.contactTitle.trim();
  if (f.contactAddress.trim()) contact.address = f.contactAddress.trim();
  if (f.contactHours.trim()) contact.hours = f.contactHours.trim();
  if (f.contactMapHint.trim()) contact.mapHint = f.contactMapHint.trim();
  if (Object.keys(contact).length) payload.contact = contact;
  return payload;
}

export default function SiteContentPage() {
  const { token, user } = useCrmSession();
  const [locale, setLocale] = useState<Locale>("ru");
  const [form, setForm] = useState<FormState>(payloadToForm({}));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOwnerLandingContent(token, locale);
      setForm(payloadToForm(data.payload || {}));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, [token, locale]);

  useEffect(() => {
    if (user.role === "owner") void load();
  }, [user.role, load]);

  async function onSave() {
    setSaving(true);
    try {
      const payload = formToPayload(form);
      await putOwnerLandingContent(token, { locale, payload });
      toast.success("Сохранено. Лендинг подтянет изменения в течение ~1 минуты (кэш ISR).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (user.role !== "owner") {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-amber-900">Раздел доступен только владельцу (owner).</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-slate-900">Контент лендинга</h1>
          <p className="mt-1 text-sm text-slate-600">
            Тексты для выбранной локали подмешиваются поверх статических переводов. Пустые поля не перезаписывают словарь.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Локаль</span>
              <Select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="h-10 min-w-[8rem]">
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              {loading ? "Загрузка…" : "Загрузить с сервера"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Бренд</span>
              <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Телефон (как на сайте)</span>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Город</span>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </label>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hero</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Бейдж</span>
                <Input value={form.heroBadge} onChange={(e) => setForm((f) => ({ ...f, heroBadge: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Заголовок 1</span>
                <Input value={form.heroTitle1} onChange={(e) => setForm((f) => ({ ...f, heroTitle1: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Заголовок 2</span>
                <Input value={form.heroTitle2} onChange={(e) => setForm((f) => ({ ...f, heroTitle2: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Подзаголовок</span>
                <Textarea rows={3} value={form.heroSubtitle} onChange={(e) => setForm((f) => ({ ...f, heroSubtitle: e.target.value }))} />
              </label>
            </div>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-600">Заголовок блока «Почему мы»</span>
            <Input value={form.highlightsTitle} onChange={(e) => setForm((f) => ({ ...f, highlightsTitle: e.target.value }))} />
          </label>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Контакты</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Заголовок</span>
                <Input value={form.contactTitle} onChange={(e) => setForm((f) => ({ ...f, contactTitle: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Адрес</span>
                <Input value={form.contactAddress} onChange={(e) => setForm((f) => ({ ...f, contactAddress: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">График</span>
                <Input value={form.contactHours} onChange={(e) => setForm((f) => ({ ...f, contactHours: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-slate-600">Подсказка карты</span>
                <Textarea rows={2} value={form.contactMapHint} onChange={(e) => setForm((f) => ({ ...f, contactMapHint: e.target.value }))} />
              </label>
            </div>
          </div>

          <Button type="button" variant="primary" disabled={saving} onClick={() => void onSave()}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
