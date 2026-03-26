"use client";

import { useMemo, useState } from "react";

type BookingPayload = {
  name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  service?: string | null;
  starts_at: string;
  comment?: string | null;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeKgPhone(input: string): { e164: string | null; pretty: string } {
  const d = digitsOnly(input);
  // Accept:
  // - +996XXXXXXXXX (12 digits with country code)
  // - 996XXXXXXXXX
  // - 0XXXXXXXXX (10 digits, national format) -> 996 + last 9 digits
  let e164Digits: string | null = null;
  if (d.startsWith("996") && d.length === 12) {
    e164Digits = d;
  } else if (d.startsWith("0") && d.length === 10) {
    e164Digits = `996${d.slice(1)}`;
  } else if (d.length === 9) {
    // user typed without leading 0/country
    e164Digits = `996${d}`;
  }

  const pretty = (() => {
    const digits = e164Digits ?? (d.startsWith("996") ? d : `996${d}`).slice(0, 12);
    const cc = digits.slice(0, 3);
    const a = digits.slice(3, 6);
    const b = digits.slice(6, 9);
    const c = digits.slice(9, 12);
    const parts = [a, b, c].filter(Boolean);
    return `+${cc}${parts.length ? ` ${parts.join(" ")}` : ""}`.trim();
  })();

  return { e164: e164Digits ? `+${e164Digits}` : null, pretty };
}

function buildStartsAtISO(date: string, time: string) {
  // date: YYYY-MM-DD, time: HH:mm -> interpreted as local time, then converted to ISO UTC
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString();
}

function isWithinWorkingHours(time: string) {
  // Allowed: 10:00 through 21:00 (inclusive)
  return time >= "10:00" && time <= "21:00";
}

function generateAllowedTimes() {
  const options: string[] = [];
  for (let hour = 10; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      if (hour === 21 && minute > 0) continue;
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
}

export function BookingForm({
  labels,
  serviceOptions,
  apiBaseUrl,
}: {
  labels: {
    name: string;
    phone: string;
    service: string;
    date: string;
    time: string;
    comment: string;
    submit: string;
    consent: string;
    placeholders: { name: string; phone: string; comment: string };
  };
  serviceOptions: readonly string[];
  apiBaseUrl: string;
}) {
  const timeOptions = useMemo(() => generateAllowedTimes(), []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState(serviceOptions[0] || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [comment, setComment] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const phoneNormalized = useMemo(() => normalizeKgPhone(phone), [phone]);

  const validationError = useMemo(() => {
    if (!name.trim()) return "Введите имя";
    if (!phoneNormalized.e164) return "Введите номер Кыргызстана: +996 XXX XXX XXX";
    if (!date) return "Выберите дату";
    if (!time) return "Выберите время";
    if (!isWithinWorkingHours(time)) return "Выберите время с 10:00 до 21:00";
    const startsAt = new Date(`${date}T${time}:00`).getTime();
    if (Number.isNaN(startsAt)) return "Некорректная дата/время";
    if (startsAt < Date.now()) return "Выберите время в будущем";
    return null;
  }, [name, phoneNormalized.e164, date, time]);

  async function submit() {
    if (status === "loading") return;
    if (validationError) {
      setStatus("error");
      setMessage(validationError);
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      const payload: BookingPayload = {
        name: name.trim(),
        phone: phoneNormalized.e164!,
        service: service || null,
        starts_at: buildStartsAtISO(date, time),
        comment: comment.trim() ? comment.trim() : null,
      };

      const res = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/public/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setStatus("success");
      setMessage("Готово! Мы получили заявку и скоро свяжемся с вами.");
      setName("");
      setPhone("");
      setDate("");
      setTime("");
      setComment("");
      setService(serviceOptions[0] || "");
    } catch {
      setStatus("error");
      setMessage("Не удалось отправить заявку. Попробуйте ещё раз.");
    }
  }

  return (
    <form
      className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {status !== "idle" && message ? (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            status === "success"
              ? "border-cyan-200 bg-cyan-50 text-[#11766E]"
              : status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-zinc-200 bg-zinc-50 text-zinc-900",
          ].join(" ")}
          role="status"
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-zinc-700">{labels.name}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-4 outline-none ring-cyan-200 focus:ring-4"
            placeholder={labels.placeholders.name}
            autoComplete="name"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-zinc-700">{labels.phone}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhone(phoneNormalized.pretty)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-4 outline-none ring-cyan-200 focus:ring-4"
            placeholder={labels.placeholders.phone}
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-xs font-medium text-zinc-700">{labels.service}</span>
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-4 outline-none ring-cyan-200 focus:ring-4"
        >
          {serviceOptions.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-zinc-700">{labels.date}</span>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            className="h-11 rounded-xl border border-zinc-200 bg-white px-4 outline-none ring-cyan-200 focus:ring-4"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-zinc-700">{labels.time}</span>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-4 outline-none ring-cyan-200 focus:ring-4"
          >
            <option value="">--</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-xs font-medium text-zinc-700">{labels.comment}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-24 rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none ring-cyan-200 focus:ring-4"
          placeholder={labels.placeholders.comment}
        />
      </label>

      <button
        type="submit"
        disabled={status === "loading"}
        className={[
          "mt-1 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm",
          status === "loading" ? "bg-[#14B8A6]/70" : "bg-[#14B8A6] hover:bg-[#11766E]",
        ].join(" ")}
      >
        {status === "loading" ? "Отправляем..." : labels.submit}
      </button>
      <div className="text-xs text-zinc-500">{labels.consent}</div>
    </form>
  );
}

