import type {
  AnalyticsSummaryResponse,
  HotspotClusterItem,
  TrendDataPoint,
} from "@/types/analytics";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export async function fetchAnalyticsSummaryApi(
  accessToken: string
): Promise<AnalyticsSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
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
  const res = await fetch(`${API_BASE_URL}/analytics/trends?days=${days}`, {
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
  const res = await fetch(`${API_BASE_URL}/analytics/hotspots`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch analytics hotspots");
  }

  return res.json();
}
