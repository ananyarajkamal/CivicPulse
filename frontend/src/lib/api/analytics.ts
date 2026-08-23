import type {
  AnalyticsSummaryResponse,
  HotspotClusterItem,
  TrendDataPoint,
} from "@/types/analytics";
import { useAuthStore } from "@/store/authStore";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? "/api/proxy" : "https://civicpulse-api-i6ne.onrender.com/api/v1")
).replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 12000;

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

    if (response.status === 401) {
      useAuthStore.getState().clearAuth();
    }

    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error("Unable to reach CivicPulse services. Please check network connection.");
  } finally {
    clearTimeout(id);
  }
}

export async function fetchAnalyticsSummaryApi(
  accessToken: string
): Promise<AnalyticsSummaryResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/analytics/summary`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch analytics summary");
  }

  return res.json();
}

export async function fetchAnalyticsTrendsApi(
  days: number = 30,
  accessToken: string
): Promise<TrendDataPoint[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/analytics/trends?days=${days}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch analytics trends");
  }

  return res.json();
}

export async function fetchAnalyticsHotspotsApi(
  accessToken: string
): Promise<HotspotClusterItem[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/analytics/hotspots`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch analytics hotspots");
  }

  return res.json();
}
