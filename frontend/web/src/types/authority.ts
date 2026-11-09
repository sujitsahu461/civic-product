import { Complaint, ComplaintPriority, ComplaintStatus } from './complaint';

export interface DashboardSummary {
  total_complaints: number;
  directly_assigned: number;
  today_new: number;
  urgent_active: number;
  pending: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  closed: number;
}

export interface StatusBreakdownItem {
  count: number;
  percentage: number;
}

export interface DailyTrendItem {
  date: string;
  count: number;
}

export interface ComplaintStats {
  period_days: number;
  total_complaints: number;
  status_breakdown: Record<string, StatusBreakdownItem>;
  avg_resolution_hours: number | null;
  sla_compliance_rate?: number;
  daily_trend: DailyTrendItem[];
  total_feedbacks?: number;
  average_rating?: number;
}

export interface CitizenFeedbackItem {
  public_id: string;
  complaint_public_id: string;
  complaint_tracking_code: string;
  complaint_title: string;
  complaint_category: string;
  citizen_name: string;
  citizen_email: string;
  rating: number;
  satisfaction_level: string;
  resolution_quality: string;
  timeliness: string;
  comments: string;
  is_issue_resolved: boolean;
  created_at: string;
}

export interface CategoryPerformanceItem {
  category: string;
  category_display: string;
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  avg_resolution_hours: number | null;
}

export interface DepartmentPerformance {
  department: string | null;
  total_in_department: number;
  categories: CategoryPerformanceItem[];
}

export interface PriorityBreakdown {
  total_active: number;
  breakdown: Record<string, { count: number; percentage: number }>;
}

export interface AuthorityNotification {
  id: number;
  public_id: string;
  title: string;
  message: string;
  notification_type: string;
  complaint?: Complaint | null;
  complaint_tracking_code?: string | null;
  complaint_title?: string | null;
  is_read: boolean;
  created_at: string;
}
