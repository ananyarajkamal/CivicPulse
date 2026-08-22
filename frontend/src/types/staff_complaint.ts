export interface AILogEntry {
  id: string;
  agent_name: string;
  provider?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  latency_ms?: number | null;
  success: boolean;
  error_message?: string | null;
  created_at: string;
}

export interface StaffComplaintDetailResponse {
  id: string;
  tracking_id: string;
  title?: string | null;
  raw_text: string;
  submitter_name?: string | null;
  submitter_contact?: string | null;
  status: string;
  priority: string;
  priority_score?: number | null;
  is_safety_risk: boolean;
  location_text?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  ward?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  ai_classification_raw?: Record<string, unknown> | null;
  ai_confidence?: number | null;
  duplicate_of?: string | null;
  assigned_to?: string | null;
  sla_deadline?: string | null;
  sla_breached: boolean;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  timeline: { status: string; timestamp: string }[];
  ai_logs: AILogEntry[];
}

export interface RelatedComplaintResponse {
  complaint_id: string;
  related_id: string;
  related_tracking_id: string;
  related_title?: string | null;
  related_status: string;
  related_priority: string;
  similarity_score: number;
  detection_method: string;
  created_at: string;
}

export interface CommentResponse {
  id: string;
  complaint_id: string;
  author_id?: string | null;
  author_name?: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface KPIResponse {
  total_complaints: number;
  unassigned_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
  sla_breached_complaints: number;
}
