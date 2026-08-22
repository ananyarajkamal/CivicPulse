export interface CategoryBreakdownItem {
  category_name: string;
  count: number;
}

export interface DepartmentBreakdownItem {
  department_name: string;
  count: number;
}

export interface PriorityBreakdownItem {
  priority: string;
  count: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
}

export interface AnalyticsSummaryResponse {
  total_complaints: number;
  sla_compliance_rate: number;
  categories: CategoryBreakdownItem[];
  departments: DepartmentBreakdownItem[];
  priorities: PriorityBreakdownItem[];
  statuses: StatusBreakdownItem[];
}

export interface TrendDataPoint {
  date: string;
  count: number;
}

export interface HotspotClusterItem {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  complaint_count: number;
  primary_category?: string | null;
}
