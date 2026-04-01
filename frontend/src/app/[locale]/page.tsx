import Image from "next/image";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BookingForm } from "@/components/BookingForm";
import { MobileMenu } from "@/components/MobileMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { getDictionary } from "@/i18n";
import type { Locale } from "@/i18n/locales";
import { applyLandingOverrides } from "@/lib/landing-overrides";
import { landingDemoPhotos } from "@/lib/landing-demo-photos";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const baseDict = getDictionary(locale);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  let t = baseDict;
  try {
    const r = await fetch(
      `${apiBaseUrl.replace(/\/+$/, "")}/public/landing-content?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 60 } },
    );
    if (r.ok) {
      const data = (await r.json()) as { payload?: Record<string, unknown> };
      if (data.payload && Object.keys(data.payload).length > 0) {
        t = applyLandingOverrides(baseDict, data.payload);
      }
    }
  } catch {
    /* офлайн / API недоступен — остаётся статический словарь */
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-zinc-100">
              <BrandLogo compact className="scale-[0.52]" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold text-[#11766E]">{t.brand.toUpperCase()}</div>
              <div className="text-xs text-zinc-500">{t.city}</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-zinc-700 md:flex">
            <a className="hover:text-zinc-950" href={`/${locale}/#about`}>
              {t.nav.about}
            </a>
            <a className="hover:text-zinc-950" href={`/${locale}/#services`}>
              {t.nav.services}
            </a>
            <a className="hover:text-zinc-950" href={`/${locale}/#shop`}>
              {t.nav.shop}
            </a>
            <a className="font-semibold text-[#11766E] hover:text-[#0f5f59]" href={`/${locale}/crm/login`}>
              {t.nav.crm}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher currentLocale={locale} labels={t.lang} />
            <a
              className="hidden text-sm font-medium text-zinc-700 hover:text-zinc-950 sm:block"
              href={`tel:${t.phone.replace(/[^\d+]/g, "")}`}
            >
              {t.phone}
            </a>
            <a
              href={`/${locale}/#booking`}
              className="hidden h-9 items-center justify-center rounded-full bg-[#14B8A6] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#11766E] md:inline-flex"
            >
              {t.nav.booking}
            </a>
            <MobileMenu
              locale={locale}
              labels={{
                menu: t.mobile.menu,
                about: t.nav.about,
                services: t.nav.services,
                shop: t.nav.shop,
                booking: t.nav.booking,
                crm: t.nav.crm,
              }}
            />
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_10%,rgba(35,211,238,0.24),transparent_60%),radial-gradient(900px_500px_at_90%_0%,rgba(20,184,166,0.14),transparent_55%)]" />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:grid-cols-2 lg:items-center">
            <div className="relative">
              <div className="mb-4 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-[#11766E]">
                {t.hero.badge}
              </div>
              <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
                {t.hero.title1}
                <br />
                {t.hero.title2}
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-zinc-600 sm:text-lg">
                {t.hero.subtitle}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href={`/${locale}/#shop`}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
                >
                  {t.hero.ctaCatalog}
                </a>
                <a
                  href={`/${locale}/#booking`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#14B8A6] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#11766E]"
                >
                  {t.hero.ctaBooking}
                </a>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                {t.hero.pills.map((x) => (
                  <span key={x} className="rounded-full bg-zinc-100 px-3 py-1">
                    {x}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-sm">
                <Image
                  src={landingDemoPhotos.hero.src}
                  alt={landingDemoPhotos.hero.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(260px_260px_at_25%_35%,rgba(35,211,238,0.18),transparent_55%),radial-gradient(240px_240px_at_80%_25%,rgba(20,184,166,0.12),transparent_60%)]" />
                <div className="absolute left-4 right-4 top-4 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm backdrop-blur sm:left-6 sm:right-6 sm:p-4">
                  <BrandLogo />
                </div>
                <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-3 p-4 sm:p-6">
                  {t.hero.stats.map((s) => (
                    <div key={s.k} className="rounded-2xl bg-white/90 p-4 shadow-sm backdrop-blur">
                      <div className="text-xs text-zinc-500">{s.k}</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-900">{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 text-xs text-zinc-500">{t.hero.note}</div>
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t.highlights.title}</h2>
            <a className="hidden text-sm font-semibold text-[#11766E] hover:text-[#0f5f59] sm:block" href={`/${locale}/#booking`}>
              {t.nav.booking} →
            </a>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {t.highlights.items.map((item, idx) => (
              <article key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-cyan-50 px-2 text-xs font-bold text-[#11766E]">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 text-base font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="shop" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t.popular.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{t.popular.subtitle}</p>
            </div>
            <a className="hidden text-sm font-semibold text-[#11766E] hover:text-[#0f5f59] sm:block" href={`/${locale}/#booking`}>
              {t.nav.booking} →
            </a>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {t.popular.items.map((item, idx) => {
              const photo = landingDemoPhotos.popular[idx % landingDemoPhotos.popular.length];
              return (
                <div
                  key={item.name}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="text-xs text-zinc-500">Brand</div>
                    <div className="mt-1 text-sm font-bold text-zinc-900">{item.price}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="services" className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t.services.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">{t.services.subtitle}</p>

            <div className="mt-6 space-y-3">
              {t.services.items.map((s) => (
                <details
                  key={s.title}
                  className="group rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 open:bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-cyan-50 text-[#11766E]">
                        <span className="text-sm font-bold">◎</span>
                      </span>
                      <span className="text-sm font-semibold sm:text-base">{s.title}</span>
                    </div>
                    <span className="text-zinc-500 group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="mt-3 pl-12 text-sm leading-7 text-zinc-600">{s.text}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="booking" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-5 shadow-sm sm:p-10">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t.booking.title}</h2>
                <p className="mt-2 text-sm text-zinc-600">{t.booking.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
                  {t.booking.badges.map((b) => (
                    <span key={b} className="rounded-full bg-white px-3 py-1 shadow-sm">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <BookingForm
                  apiBaseUrl={apiBaseUrl}
                  labels={t.booking.form}
                  serviceOptions={t.booking.form.serviceOptions}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 sm:px-6 sm:pb-14 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 lg:col-span-2">
              <h3 className="text-lg font-bold text-zinc-900">{t.contact.title}</h3>
              <p className="mt-2 text-sm text-zinc-700">{t.contact.address}</p>
              <p className="mt-1 text-sm text-zinc-700">{t.contact.hours}</p>
              <p className="mt-3 text-xs text-zinc-500">{t.contact.mapHint}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">{t.city}</div>
              <div className="mt-3 grid gap-2">
                <a
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#14B8A6] px-4 text-sm font-semibold text-white hover:bg-[#11766E]"
                  href={`tel:${t.phone.replace(/[^\d+]/g, "")}`}
                >
                  {t.contact.ctaPhone}
                </a>
                <a
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.contact.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.contact.ctaRoute}
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>© {new Date().getFullYear()} {t.brand}</span>
            <a className="text-[#11766E] hover:text-[#0f5f59]" href={`tel:${t.phone.replace(/[^\d+]/g, "")}`}>
              {t.phone}
            </a>
          </div>
        </footer>
      </main>

      {/* Mobile-first sticky booking CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 md:hidden">
        <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-lg backdrop-blur">
          <a
            href={`/${locale}/#booking`}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#14B8A6] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#11766E]"
          >
            {t.mobile.stickyCta}
          </a>
        </div>
      </div>

      {/* Spacer so sticky CTA doesn't cover content */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

