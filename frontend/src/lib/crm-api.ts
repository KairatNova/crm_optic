/** Типы совпадают с backend `AuthUserRead` / `TokenResponse`. */

export type CrmUser = {
  id: number;
  username: string | null;
  phone: string | null;
  full_name: string | null;
  email: string | null;
  telegram_username: string | null;
  telegram_chat_id: number | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: CrmUser;
};

export type LoginRequestOut = {
  telegram_link: string;
  message: string;
};

/** Канонические статусы записи (Kanban / PATCH). Другие строки возможны у старых данных. */
export type AppointmentStatus = "new" | "confirmed" | "in_progress" | "done" | "cancelled";

export type AppointmentRead = {
  id: number;
  client_id: number;
  service: string | null;
  starts_at: string;
  status: string | null;
  comment: string | null;
  created_at: string;
  cancellation_reason?: string | null;
  /** landing — с сайта; crm — из CRM; отсутствует у старых записей */
  source?: string | null;
};

export type ClientRead = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  birth_date: string | null;
};

export type AnalyticsSummary = {
  total_clients: number;
  new_clients: number;
  appointments_total: number;
  appointments_done: number;
  conversion_percent: number;
  popular_services: { label: string; count: number }[];
};

/** Карточка записи: запись + профиль клиента */
export type AppointmentDetailRead = AppointmentRead & {
  client: ClientRead;
};

export type ClientCardRead = {
  client: ClientRead;
  visits: VisitRead[];
  vision_tests: VisionTestRead[];
};

export type VisitRead = {
  id: number;
  client_id: number;
  visited_at: string;
  comment: string | null;
};

export type VisionTestRead = {
  id: number;
  client_id: number;
  tested_at: string;
  od_sph: string | null;
  od_cyl: string | null;
  od_axis: string | null;
  os_sph: string | null;
  os_cyl: string | null;
  os_axis: string | null;
  pd: string | null;
  va_r: string | null;
  va_l: string | null;
  lens_type: string | null;
  frame_model: string | null;
  comment: string | null;
};

type ApiError = Error & { status?: number };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function apiUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/+$/, "")}${path}`;
}

function withAuth(token?: string): HeadersInit {
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseJsonOrText<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { detail: text } as T;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) {
    const payload = await parseJsonOrText<{ detail?: string | unknown }>(response);
    const detail = payload.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? JSON.stringify(detail)
          : detail && typeof detail === "object"
            ? JSON.stringify(detail)
            : `HTTP ${response.status}`;
    const err = new Error(msg) as ApiError;
    err.status = response.status;
    throw err;
  }
  return parseJsonOrText<T>(response);
}

/** Шаг 1: логин (username или телефон) + пароль → ссылка на бота. */
export async function authLoginRequest(payload: { login: string; password: string }): Promise<LoginRequestOut> {
  return request<LoginRequestOut>("/auth/login-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Шаг 2: тот же логин + 6-значный код из Telegram → JWT. */
export async function authLoginVerify(payload: { login: string; verification_code: string }): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getMe(token: string): Promise<CrmUser> {
  return request<CrmUser>("/auth/me", { headers: withAuth(token) });
}

export async function getAppointments(
  token: string,
  filter?: string | { status?: string; clientId?: number },
): Promise<AppointmentRead[]> {
  const sp = new URLSearchParams();
  if (typeof filter === "string" && filter) {
    sp.set("status", filter);
  } else if (filter && typeof filter === "object") {
    if (filter.status) sp.set("status", filter.status);
    if (filter.clientId != null) sp.set("client_id", String(filter.clientId));
  }
  const qs = sp.toString() ? `?${sp}` : "";
  return request<AppointmentRead[]>(`/appointments${qs}`, { headers: withAuth(token) });
}

export async function createAppointment(
  token: string,
  payload: {
    client_id: number;
    service?: string | null;
    starts_at: string;
    status?: AppointmentStatus | string | null;
    comment?: string | null;
  },
): Promise<AppointmentRead> {
  return request<AppointmentRead>("/appointments", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function getAppointmentDetail(token: string, appointmentId: number): Promise<AppointmentDetailRead> {
  return request<AppointmentDetailRead>(`/appointments/${appointmentId}`, { headers: withAuth(token) });
}

export async function patchAppointment(
  token: string,
  appointmentId: number,
  payload: {
    status?: AppointmentStatus | string;
    comment?: string | null;
    service?: string | null;
    starts_at?: string;
    cancellation_reason?: string | null;
  },
): Promise<AppointmentRead> {
  return request<AppointmentRead>(`/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function softDeleteAppointment(token: string, appointmentId: number): Promise<void> {
  const response = await fetch(apiUrl(`/appointments/${appointmentId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const payload = await parseJsonOrText<{ detail?: string | unknown }>(response);
    const detail = payload.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? JSON.stringify(detail)
          : detail && typeof detail === "object"
            ? JSON.stringify(detail)
            : `HTTP ${response.status}`;
    const err = new Error(msg) as ApiError;
    err.status = response.status;
    throw err;
  }
}

export async function softDeleteClient(token: string, clientId: number): Promise<void> {
  const response = await fetch(apiUrl(`/clients/${clientId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const payload = await parseJsonOrText<{ detail?: string | unknown }>(response);
    const detail = payload.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? JSON.stringify(detail)
          : detail && typeof detail === "object"
            ? JSON.stringify(detail)
            : `HTTP ${response.status}`;
    const err = new Error(msg) as ApiError;
    err.status = response.status;
    throw err;
  }
}

export async function getClient(token: string, clientId: number): Promise<ClientRead> {
  return request<ClientRead>(`/clients/${clientId}`, { headers: withAuth(token) });
}

export async function lookupClientByPhone(token: string, phone: string): Promise<ClientRead | null> {
  try {
    return await request<ClientRead>(`/clients/lookup?phone=${encodeURIComponent(phone)}`, {
      headers: withAuth(token),
    });
  } catch (e: unknown) {
    const st = typeof e === "object" && e !== null && "status" in e ? (e as ApiError).status : undefined;
    if (st === 404) return null;
    throw e;
  }
}

export async function getAnalyticsSummary(
  token: string,
  params?: { from?: string; to?: string },
): Promise<AnalyticsSummary> {
  const sp = new URLSearchParams();
  if (params?.from) sp.set("from_date", params.from);
  if (params?.to) sp.set("to_date", params.to);
  const qs = sp.toString() ? `?${sp}` : "";
  return request<AnalyticsSummary>(`/analytics/summary${qs}`, { headers: withAuth(token) });
}

export async function getClientCard(token: string, clientId: number): Promise<ClientCardRead> {
  return request<ClientCardRead>(`/clients/${clientId}/card`, { headers: withAuth(token) });
}

export async function patchClient(
  token: string,
  clientId: number,
  payload: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    gender?: string | null;
    birth_date?: string | null;
  },
): Promise<ClientRead> {
  return request<ClientRead>(`/clients/${clientId}`, {
    method: "PATCH",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function getClients(token: string): Promise<ClientRead[]> {
  return request<ClientRead[]>("/clients", { headers: withAuth(token) });
}

export async function createClient(
  token: string,
  payload: {
    name: string;
    phone: string;
    email?: string | null;
    gender?: string | null;
    birth_date?: string | null;
  },
): Promise<ClientRead> {
  return request<ClientRead>("/clients", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function getVisits(token: string, clientId: number): Promise<VisitRead[]> {
  return request<VisitRead[]>(`/clients/${clientId}/visits`, { headers: withAuth(token) });
}

export async function patchVisit(
  token: string,
  clientId: number,
  visitId: number,
  payload: { visited_at?: string | null; comment?: string | null },
): Promise<VisitRead> {
  return request<VisitRead>(`/clients/${clientId}/visits/${visitId}`, {
    method: "PATCH",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function createVisit(
  token: string,
  clientId: number,
  payload: { visited_at?: string; comment?: string | null },
): Promise<VisitRead> {
  return request<VisitRead>(`/clients/${clientId}/visits`, {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function createVisitAndVisionTest(
  token: string,
  clientId: number,
  payload: {
    visit: { visited_at?: string; comment?: string | null };
    vision_test: {
      tested_at?: string;
      od_sph?: string | null;
      od_cyl?: string | null;
      od_axis?: string | null;
      os_sph?: string | null;
      os_cyl?: string | null;
      os_axis?: string | null;
      pd?: string | null;
      va_r?: string | null;
      va_l?: string | null;
      lens_type?: string | null;
      frame_model?: string | null;
      comment?: string | null;
    };
  },
): Promise<{ visit: VisitRead; vision_test: VisionTestRead }> {
  return request<{ visit: VisitRead; vision_test: VisionTestRead }>(`/clients/${clientId}/visit-and-vision`, {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function getVisionTests(token: string, clientId: number): Promise<VisionTestRead[]> {
  return request<VisionTestRead[]>(`/clients/${clientId}/vision-tests`, { headers: withAuth(token) });
}

export async function patchVisionTest(
  token: string,
  clientId: number,
  visionTestId: number,
  payload: {
    tested_at?: string | null;
    od_sph?: string | null;
    od_cyl?: string | null;
    od_axis?: string | null;
    os_sph?: string | null;
    os_cyl?: string | null;
    os_axis?: string | null;
    pd?: string | null;
    va_r?: string | null;
    va_l?: string | null;
    lens_type?: string | null;
    frame_model?: string | null;
    comment?: string | null;
  },
): Promise<VisionTestRead> {
  return request<VisionTestRead>(`/clients/${clientId}/vision-tests/${visionTestId}`, {
    method: "PATCH",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function deleteVisionTest(
  token: string,
  clientId: number,
  visionTestId: number,
): Promise<VisionTestRead> {
  return request<VisionTestRead>(`/clients/${clientId}/vision-tests/${visionTestId}`, {
    method: "DELETE",
    headers: withAuth(token),
  });
}

export async function createVisionTest(
  token: string,
  clientId: number,
  payload: {
    tested_at?: string;
    od_sph?: string | null;
    od_cyl?: string | null;
    od_axis?: string | null;
    os_sph?: string | null;
    os_cyl?: string | null;
    os_axis?: string | null;
    pd?: string | null;
    va_r?: string | null;
    va_l?: string | null;
    lens_type?: string | null;
    frame_model?: string | null;
    comment?: string | null;
  },
): Promise<VisionTestRead> {
  return request<VisionTestRead>(`/clients/${clientId}/vision-tests`, {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function deleteVisit(
  token: string,
  clientId: number,
  visitId: number,
): Promise<VisitRead> {
  return request<VisitRead>(`/clients/${clientId}/visits/${visitId}`, {
    method: "DELETE",
    headers: withAuth(token),
  });
}

export async function listOwnerAdmins(token: string): Promise<CrmUser[]> {
  return request<CrmUser[]>("/owner/admins", { headers: withAuth(token) });
}

export async function createOwnerAdmin(
  token: string,
  payload: {
    username?: string | null;
    phone?: string | null;
    password: string;
    full_name?: string | null;
    email?: string | null;
    telegram_username?: string | null;
    role?: "admin";
  },
): Promise<CrmUser> {
  return request<CrmUser>("/owner/admins", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function patchOwnerAdmin(
  token: string,
  adminId: number,
  payload: {
    is_active?: boolean;
    password?: string | null;
    username?: string | null;
    phone?: string | null;
    full_name?: string | null;
    email?: string | null;
    telegram_username?: string | null;
  },
): Promise<CrmUser> {
  return request<CrmUser>(`/owner/admins/${adminId}`, {
    method: "PATCH",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export type OwnerExportVariant = "clients_latest_vision" | "clients_all_vision";

/** Скачать .xlsx (только для owner; иначе API вернёт 403). */
export async function downloadOwnerExportExcel(token: string, variant: OwnerExportVariant): Promise<void> {
  const path =
    variant === "clients_all_vision"
      ? "/owner/export/clients-all-vision.xlsx"
      : "/owner/export/clients-latest-vision.xlsx";
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const payload = await parseJsonOrText<{ detail?: string | unknown }>(response);
    const detail = payload.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? JSON.stringify(detail)
          : detail && typeof detail === "object"
            ? JSON.stringify(detail)
            : `HTTP ${response.status}`;
    const err = new Error(msg) as ApiError;
    err.status = response.status;
    throw err;
  }
  const blob = await response.blob();
  const cd = response.headers.get("Content-Disposition");
  let filename = variant === "clients_all_vision" ? "clients_all_vision.xlsx" : "clients_latest_vision.xlsx";
  const m = cd?.match(/filename="([^"]+)"/);
  if (m?.[1]) filename = m[1];
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
