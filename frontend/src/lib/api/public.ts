import type { CitizenComplaintResponse } from "@/types/complaint";

const API_BASE_URL = "/api/proxy";

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

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  department_id: string;
  default_priority: string;
}

export interface GeocodeItem {
  display_name: string;
  lat: number;
  lng: number;
}

export interface ComplaintSubmitRequest {
  raw_text: string;
  location_text?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  category_id?: string;
  department_id?: string;
  submitter_name?: string;
  submitter_contact?: string;
}

export interface ComplaintSubmitResponse {
  tracking_id: string;
  status: string;
  created_at: string;
  message: string;
}

export async function fetchDepartmentsApi(): Promise<DepartmentItem[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/departments`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchCategoriesApi(): Promise<CategoryItem[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/categories`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function geocodeAddressApi(query: string): Promise<GeocodeItem[]> {
  if (query.trim().length < 3) return [];
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/geocode?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function submitComplaintApi(
  payload: ComplaintSubmitRequest
): Promise<ComplaintSubmitResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Submission failed" }));
    throw new Error(errorData.detail || "Failed to submit complaint.");
  }

  return res.json();
}

export async function trackComplaintApi(
  trackingId: string
): Promise<CitizenComplaintResponse> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/complaints/track/${encodeURIComponent(trackingId)}`
  );

  if (!res.ok) {
    throw new Error("Complaint not found. Please check your tracking ID.");
  }

  return res.json();
}
