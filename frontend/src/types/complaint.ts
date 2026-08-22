export interface TimelineEntry {
  status: string;
  timestamp: string;
  notes?: string | null;
}

export interface CitizenComplaintResponse {
  tracking_id: string;
  status: string;
  title?: string | null;
  category?: string | null;
  department?: string | null;
  priority: string;
  location_address?: string | null;
  sla_deadline?: string | null;
  sla_breached: boolean;
  created_at: string;
  updated_at?: string | null;
  timeline: TimelineEntry[];
}
