import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useParams: () => ({ locale: "ru" }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const authLoginRequest = vi.fn();
const authLoginVerify = vi.fn();

vi.mock("@/lib/crm-api", () => ({
  authLoginRequest: (...args: unknown[]) => authLoginRequest(...args),
  authLoginVerify: (...args: unknown[]) => authLoginVerify(...args),
}));

const saveCrmSession = vi.fn();

vi.mock("@/lib/crm-auth", () => ({
  saveCrmSession: (...args: unknown[]) => saveCrmSession(...args),
}));

import CrmLoginPage from "@/app/[locale]/crm/login/page";

describe("CrmLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("получает ссылку на бота, затем вход по коду", async () => {
    const user = userEvent.setup();
    authLoginRequest.mockResolvedValue({
      telegram_link: "https://t.me/test_bot?start=token",
      message: "Откройте бота",
    });
    authLoginVerify.mockResolvedValue({
      access_token: "jwt-token",
      token_type: "bearer",
      user: {
        id: 1,
        username: "admin",
        phone: null,
        full_name: null,
        email: null,
        telegram_username: null,
        telegram_chat_id: null,
        role: "admin",
        is_active: true,
        is_verified: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    });

    render(<CrmLoginPage />);

    await user.type(screen.getByRole("textbox", { name: /логин/i }), "admin");
    await user.type(screen.getByLabelText(/Пароль/i), "secretpass");
    await user.click(screen.getByRole("button", { name: /^Вход$/i }));

    await waitFor(() => {
      expect(authLoginRequest).toHaveBeenCalledWith({ login: "admin", password: "secretpass" });
    });

    const botLink = await screen.findByRole("link", { name: /Открыть бота в Telegram/i });
    expect(botLink.getAttribute("href")).toBe("https://t.me/test_bot?start=token");

    await user.type(screen.getByPlaceholderText("000000"), "123456");
    await user.click(screen.getByRole("button", { name: /^Войти$/i }));

    await waitFor(() => {
      expect(authLoginVerify).toHaveBeenCalledWith({ login: "admin", verification_code: "123456" });
    });
    expect(saveCrmSession).toHaveBeenCalledWith("jwt-token", expect.objectContaining({ id: 1, role: "admin" }));
    expect(replace).toHaveBeenCalledWith("/ru/crm");
  });
});
