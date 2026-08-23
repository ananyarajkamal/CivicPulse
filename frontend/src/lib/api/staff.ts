import type { StaffComplaintDetailResponse } from "@/types/staff_complaint";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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
      throw new Error("Request timed out. Please check network connection and try again.");
    }
    throw new Error("Unable to reach CivicPulse services. Please check network connection.");
  } finally {
    clearTimeout(id);
  }
}

export interface StaffQueueFilters {
  status?: string;
  priority?: string;
  department_id?: string;
  sla_breached?: boolean;
}

export async function fetchStaffComplaintsQueueApi(
  filters: StaffQueueFilters = {},
  accessToken: string
): Promise<StaffComplaintDetailResponse[]> {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.priority) params.append("priority", filters.priority);
  if (filters.department_id) params.append("department_id", filters.department_id);
  if (filters.sla_breached !== undefined) params.append("sla_breached", String(filters.sla_breached));

  const queryString = params.toString();
  const url = `${API_BASE_URL}/complaints${queryString ? `?${queryString}` : ""}`;

  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch complaints queue" }));
    throw new Error(errorData.detail || "Failed to fetch complaints queue");
  }

  return res.json();
}

export async function fetchStaffComplaintDetailApi(
  complaintId: string,
  accessToken: string
): Promise<StaffComplaintDetailResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints/${complaintId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch complaint detail" }));
    throw new Error(errorData.detail || "Failed to fetch complaint detail");
  }

  return res.json();
}

export async function fetchRelatedComplaintsApi(
  complaintId: string,
  accessToken: string
): Promise<import("@/types/staff_complaint").RelatedComplaintResponse[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints/${complaintId}/related`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch related complaints" }));
    throw new Error(errorData.detail || "Failed to fetch related complaints");
  }

  return res.json();
}

export async function fetchKpisApi(
  accessToken: string
): Promise<import("@/types/staff_complaint").KPIResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints/kpi`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch operational KPIs");
  }

  return res.json();
}

export async function updateComplaintStatusApi(
  complaintId: string,
  toStatus: string,
  notes: string | undefined,
  accessToken: string
): Promise<StaffComplaintDetailResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints/${complaintId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to_status: toStatus.toLowerCase(), notes }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to update status" }));
    throw new Error(errorData.detail || "Failed to update status");
  }

  return res.json();
}

export async function assignComplaintOfficerApi(
  complaintId: string,
  officerId: string,
  accessToken: string
): Promise<StaffComplaintDetailResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints/${complaintId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ officer_id: officerId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to assign officer" }));
    throw new Error(errorData.detail || "Failed to assign officer");
  }

  return res.json();
}

export async function fetchInternalCommentsApi(
  complaintId: string,
  accessToken: string
): Promise<import("@/types/staff_complaint").CommentResponse[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints/${complaintId}/comments`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch internal comments");
  }

  return res.json();
}

export async function addInternalCommentApi(
  complaintId: string,
  content: string,
  accessToken: string
): Promise<import("@/types/staff_complaint").CommentResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints/${complaintId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to add comment" }));
    throw new Error(errorData.detail || "Failed to add comment");
  }

  return res.json();
}

export interface StaffUserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string | null;
  is_active: boolean;
}

export async function fetchOfficersApi(
  accessToken: string,
  departmentId?: string
): Promise<StaffUserResponse[]> {
  const url = departmentId
    ? `${API_BASE_URL}/auth/officers?department_id=${encodeURIComponent(departmentId)}`
    : `${API_BASE_URL}/auth/officers`;

  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch officers list");
  }

  return res.json();
}

export interface DemoComplaintPayload {
  source: "whatsapp_demo" | "social_demo" | "municipal_demo";
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

export async function submitDemoComplaintApi(
  payload: DemoComplaintPayload,
  accessToken: string
): Promise<StaffComplaintDetailResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/complaints/demo-intake`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Demo intake submission failed" }));
    throw new Error(errorData.detail || "Demo intake submission failed");
  }

  return res.json();
}
