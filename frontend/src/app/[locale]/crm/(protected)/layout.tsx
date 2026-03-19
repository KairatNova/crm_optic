import type { Locale } from "@/i18n/locales";
import { CrmProtectedShell } from "@/components/crm/CrmProtectedShell";

export default async function ProtectedCrmLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <CrmProtectedShell locale={locale as Locale}>{children}</CrmProtectedShell>;
}

