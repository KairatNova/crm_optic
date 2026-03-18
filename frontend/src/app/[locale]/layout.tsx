import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { Locale } from "@/i18n/locales";
import { LOCALES } from "@/i18n/locales";
import { getDictionary } from "@/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  if (!LOCALES.includes(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: `${t.brand} — ${t.booking.title}`,
    description: t.hero.subtitle,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  if (!LOCALES.includes(locale)) notFound();

  // Root layout owns <html>/<body>. Keep locale layout as a simple wrapper.
  return <>{children}</>;
}

