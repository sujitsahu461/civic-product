export type ComplaintStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'CLOSED';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type ComplaintCategory = 
  | 'ROAD' 
  | 'WATER'
  | 'ELECTRICITY' 
  | 'GARBAGE' 
  | 'DRAINAGE' 
  | 'SANITATION' 
  | 'STREET_LIGHT' 
  | 'PARKS' 
  | 'NOISE' 
  | 'OTHER';

export interface ComplaintImage {
  public_id?: string;
  id?: number;
  image: string;
  image_url?: string;
  caption?: string;
  is_resolution_proof?: boolean;
  uploaded_at: string;
}

export interface ComplaintHistoryActor {
  public_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
}

export interface ComplaintHistory {
  public_id?: string;
  id?: number;
  actor?: ComplaintHistoryActor | null;
  action?: string;
  old_status?: ComplaintStatus | string;
  new_status?: ComplaintStatus | string;
  status_from?: ComplaintStatus;
  status_to?: ComplaintStatus;
  remarks?: string;
  changed_by_name?: string;
  created_at: string;
}

export interface Complaint {
  public_id: string;
  id?: number | string;
  tracking_code: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  category_display?: string;
  department_id?: number;
  department_name?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location_address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  citizen?: ComplaintHistoryActor | null;
  citizen_name?: string;
  assigned_authority?: ComplaintHistoryActor | null;
  assigned_authority_name?: string | null;
  assigned_officer_id?: number | null;
  assigned_officer_name?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  image_count?: number;
  images?: ComplaintImage[];
  feedback_rating?: number | null;
  feedback_comments?: string | null;
  feedback?: {
    public_id?: string;
    rating: number;
    satisfaction_level?: string;
    resolution_quality?: string;
    timeliness?: string;
    comments: string;
    is_issue_resolved?: boolean;
    citizen_name?: string;
    citizen_email?: string;
    created_at?: string;
  } | null;
  latest_history?: ComplaintHistory | null;
  history?: ComplaintHistory[];
  created_at: string;
  updated_at: string;
}

export interface SubmitComplaintPayload {
  title: string;
  description: string;
  category?: ComplaintCategory;
  priority?: ComplaintPriority;
  location_address: string;
  latitude?: number | null;
  longitude?: number | null;
  images?: File[];
}

export interface ComplaintFilterParams {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
  page?: number;
  page_size?: number;
}
