export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  contact_email: string;
  contact_phone?: string;
  head_officer?: string;
  active_complaints_count?: number;
  resolved_complaints_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  description: string;
  contact_email: string;
  contact_phone?: string;
}
