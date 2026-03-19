export type CrmRole = "owner" | "admin" | "doctor";

export type CrmUser = {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  role: CrmRole;
  telegram_id: number | null;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: CrmUser;
};

export type AppointmentRead = {
  id: number;
  client_id: number;
  service: string | null;
  starts_at: string;
  status: string | null;
  comment: string | null;
  created_at: string;
};

export type ClientRead = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  birth_date: string | null;
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
    const payload = await parseJsonOrText<{ detail?: string }>(response);
    const err = new Error(payload.detail || `HTTP ${response.status}`) as ApiError;
    err.status = response.status;
    throw err;
  }
  return parseJsonOrText<T>(response);
}

export async function loginByTelegramCallback(params: Record<string, string | number>): Promise<TokenResponse> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  return request<TokenResponse>(`/auth/telegram/callback?${search.toString()}`, {
    method: "GET",
  });
}

export async function getMe(token: string): Promise<CrmUser> {
  return request<CrmUser>("/users/me", { headers: withAuth(token) });
}

export async function getAppointments(token: string, statusFilter?: string): Promise<AppointmentRead[]> {
  const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
  return request<AppointmentRead[]>(`/appointments${qs}`, { headers: withAuth(token) });
}

export async function patchAppointment(
  token: string,
  appointmentId: number,
  payload: { status?: string; comment?: string; service?: string; starts_at?: string },
): Promise<AppointmentRead> {
  return request<AppointmentRead>(`/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export async function getClient(token: string, clientId: number): Promise<ClientRead> {
  return request<ClientRead>(`/clients/${clientId}`, { headers: withAuth(token) });
}

export async function getVisits(token: string, clientId: number): Promise<VisitRead[]> {
  return request<VisitRead[]>(`/clients/${clientId}/visits`, { headers: withAuth(token) });
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

export async function getVisionTests(token: string, clientId: number): Promise<VisionTestRead[]> {
  return request<VisionTestRead[]>(`/clients/${clientId}/vision-tests`, { headers: withAuth(token) });
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

export async function createAdminByTelegramId(
  token: string,
  payload: { telegram_id: number; full_name?: string; email?: string; role?: "admin" | "doctor" },
): Promise<CrmUser> {
  return request<CrmUser>("/users", {
    method: "POST",
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

