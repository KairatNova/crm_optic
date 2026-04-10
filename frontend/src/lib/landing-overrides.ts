import type { Dictionary } from "@/i18n";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/** Подмешивает сохранённые в CRM значения поверх статического словаря лендинга. */
export function applyLandingOverrides(base: Dictionary, payload: Record<string, unknown> | null | undefined): Dictionary {
  if (!payload || !Object.keys(payload).length) return base;

  const heroIn = isRecord(payload.hero) ? payload.hero : {};
  const contactIn = isRecord(payload.contact) ? payload.contact : {};
  const highlightsIn = isRecord(payload.highlights) ? payload.highlights : {};

  return {
    ...base,
    brand: str(payload.brand) ?? base.brand,
    phone: str(payload.phone) ?? base.phone,
    city: str(payload.city) ?? base.city,
    hero: {
      ...base.hero,
      badge: str(heroIn.badge) ?? base.hero.badge,
      title1: str(heroIn.title1) ?? base.hero.title1,
      title2: str(heroIn.title2) ?? base.hero.title2,
      subtitle: str(heroIn.subtitle) ?? base.hero.subtitle,
    },
    highlights: {
      ...base.highlights,
      title: str(highlightsIn.title) ?? base.highlights.title,
    },
    contact: {
      ...base.contact,
      title: str(contactIn.title) ?? base.contact.title,
      address: str(contactIn.address) ?? base.contact.address,
      hours: str(contactIn.hours) ?? base.contact.hours,
      routeHint: str(contactIn.routeHint) ?? base.contact.routeHint,
      twoGisSearchQuery: str(contactIn.twoGisSearchQuery) ?? base.contact.twoGisSearchQuery,
      ctaPhone: str(contactIn.ctaPhone) ?? base.contact.ctaPhone,
      ctaRouteGoogle:
        str(contactIn.ctaRouteGoogle) ?? str(contactIn.ctaRoute) ?? base.contact.ctaRouteGoogle,
      ctaRoute2gis: str(contactIn.ctaRoute2gis) ?? base.contact.ctaRoute2gis,
      ctaInstagram: str(contactIn.ctaInstagram) ?? base.contact.ctaInstagram,
      ctaWhatsapp: str(contactIn.ctaWhatsapp) ?? base.contact.ctaWhatsapp,
      instagramUrl: str(contactIn.instagramUrl) ?? base.contact.instagramUrl,
      whatsappUrl: str(contactIn.whatsappUrl) ?? base.contact.whatsappUrl,
    },
  } as Dictionary;
}
