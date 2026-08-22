import type { CitizenComplaintResponse } from "@/types/complaint";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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
  const res = await fetch(`${API_BASE_URL}/departments`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchCategoriesApi(): Promise<CategoryItem[]> {
  const res = await fetch(`${API_BASE_URL}/categories`);
  if (!res.ok) return [];
  return res.json();
}

export async function geocodeAddressApi(query: string): Promise<GeocodeItem[]> {
  if (query.trim().length < 3) return [];
  const res = await fetch(
    `${API_BASE_URL}/geocode?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  return res.json();
}

export async function submitComplaintApi(
  payload: ComplaintSubmitRequest
): Promise<ComplaintSubmitResponse> {
  const res = await fetch(`${API_BASE_URL}/complaints`, {
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
  const res = await fetch(
    `${API_BASE_URL}/complaints/track/${encodeURIComponent(trackingId)}`
  );

  if (!res.ok) {
    throw new Error("Complaint not found. Please check your tracking ID.");
  }

  return res.json();
}
