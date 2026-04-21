import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BookingForm } from "./BookingForm";

function tomorrowYmd() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

const labels = {
  name: "Имя",
  phone: "Телефон",
  service: "Услуга",
  date: "Дата",
  time: "Время",
  comment: "Комментарий",
  submit: "Записаться",
  consent: "Согласие",
  placeholders: { name: "Иван", phone: "+996", comment: "Комментарий" },
};

describe("BookingForm", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 201,
          text: () => Promise.resolve("{}"),
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("отправляет POST /public/booking с валидными данными", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(
      <BookingForm
        apiBaseUrl="http://api.test"
        labels={labels}
        serviceOptions={["Проверка зрения", "Подбор оправ и линз"]}
      />,
    );

    await user.type(screen.getByPlaceholderText("Иван"), "Анна");
    await user.type(screen.getByPlaceholderText("+996"), "+996700111222");
    await user.selectOptions(screen.getByRole("combobox", { name: /Услуга/i }), "Проверка зрения");
    await user.type(screen.getByLabelText(/Дата/i), tomorrowYmd());
    await user.selectOptions(screen.getByRole("combobox", { name: /Время/i }), "12:00");
    await user.click(screen.getByRole("button", { name: /Записаться/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/public/booking");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Анна");
    expect(body.phone).toMatch(/^\+996/);
    expect(body.service).toBe("Проверка зрения");
    expect(body.starts_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(await screen.findByText(/Мы получили заявку/i)).toBeTruthy();
  });
});
