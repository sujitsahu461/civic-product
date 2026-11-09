export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  complaint_id?: number;
  created_at: string;
}
