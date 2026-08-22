import type { LoginRequest, TokenResponse, User } from "@/types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

const DEFAULT_TIMEOUT_MS = 15000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Sign in is taking longer than expected. Please try again.");
    }
    if (err instanceof Error && err.message.includes("Invalid email")) {
      throw err;
    }
    throw new Error("Unable to reach CivicPulse services. Please try again.");
  } finally {
    clearTimeout(id);
  }
}

export async function loginApi(payload: LoginRequest): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    throw new Error("Unable to reach CivicPulse services. Please try again.");
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 422) {
      throw new Error("Invalid email or password.");
    }
    const errorData = await res.json().catch(() => ({ detail: null }));
    throw new Error(errorData.detail || "Unable to reach CivicPulse services. Please try again.");
  }

  return res.json();
}

export async function refreshTokenApi(): Promise<TokenResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Token refresh failed");
  }

  return res.json();
}

export async function logoutApi(): Promise<void> {
  await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

export async function getMeApi(accessToken: string): Promise<User> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    throw new Error("Unable to reach CivicPulse services. Please try again.");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch profile");
  }

  return res.json();
}
