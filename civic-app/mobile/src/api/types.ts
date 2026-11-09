export type Tokens = { access: string; refresh: string };

export type Role = 'CITIZEN' | 'AUTHORITY' | 'SUPER_ADMIN';

export type User = {
  public_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  status: string;
  address: string;
  bio: string;
};

export type Captcha = { captcha_key: string; question: string; expires_in: number };

export type Status = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'CLOSED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ComplaintSummary = {
  public_id: string;
  tracking_code: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  category: string;
  category_display: string;
  location_address: string;
  latitude: string | null;
  longitude: string | null;
  image_count: number;
  feedback_rating: number | null;
  created_at?: string;
};

export type Attachment = { public_id: string; file?: string; image?: string; attachment_type?: string };

export type ComplaintDetail = ComplaintSummary & {
  resolution_notes: string;
  images: Attachment[];
  attachments: Attachment[];
  feedback: { rating: number; comments: string } | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  evidence_hidden?: boolean;
};

export type HistoryEntry = {
  public_id: string;
  actor: { role?: string; full_name?: string } | null;
  action: string;
  old_status: string;
  new_status: string;
  remarks: string;
  created_at: string;
};

export type Notification = {
  public_id: string;
  title: string;
  message: string;
  notification_type: string;
  complaint_tracking_code: string | null;
  complaint_title: string | null;
  is_read: boolean;
  created_at: string;
};

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type NewComplaint = {
  title: string;
  description: string;
  category?: string | null;
  priority?: string | null;
  location_address?: string;
  latitude?: number | null;
  longitude?: number | null;
  photos?: { uri: string; name: string; type: string }[];
};
