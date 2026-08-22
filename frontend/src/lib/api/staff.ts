import type { StaffComplaintDetailResponse } from "@/types/staff_complaint";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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

  const res = await fetch(url, {
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
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}`, {
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
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/related`, {
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
  const res = await fetch(`${API_BASE_URL}/complaints/kpi`, {
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
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to_status: toStatus, notes }),
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
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/assign`, {
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
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/comments`, {
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
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/comments`, {
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
