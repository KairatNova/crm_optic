"use client";

import dynamic from "next/dynamic";

import type { BookingFormProps } from "@/components/BookingForm";

function BookingFormLoading() {
  return (
    <div
      className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm"
      aria-busy="true"
      aria-label="Загрузка формы"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />
        <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />
      </div>
      <div className="h-11 animate-pulse rounded-xl bg-zinc-100" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-11 animate-pulse rounded-xl bg-zinc-100" />
        <div className="h-11 animate-pulse rounded-xl bg-zinc-100" />
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />
      <div className="h-11 animate-pulse rounded-xl bg-[#14B8A6]/30" />
    </div>
  );
}

const BookingFormClient = dynamic(
  () => import("@/components/BookingForm").then((mod) => mod.BookingForm),
  { ssr: false, loading: () => <BookingFormLoading /> },
);

export function LandingBookingForm(props: BookingFormProps) {
  return <BookingFormClient {...props} />;
}
