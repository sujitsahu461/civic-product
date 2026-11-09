import api from './api';

export interface FeedbackSubmission {
  complaint_public_id: string;
  rating: number;
  satisfaction_level?: 'VERY_UNSATISFIED' | 'UNSATISFIED' | 'NEUTRAL' | 'SATISFIED' | 'VERY_SATISFIED';
  resolution_quality?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  timeliness?: 'DELAYED' | 'ON_TIME' | 'QUICK';
  comments?: string;
  is_issue_resolved?: boolean;
}

export interface FeedbackDetail {
  public_id: string;
  complaint_public_id: string;
  complaint_tracking_code: string;
  complaint_title: string;
  complaint_category: string;
  citizen_email: string;
  citizen_name: string;
  rating: number;
  satisfaction_level: string;
  resolution_quality: string;
  timeliness: string;
  comments: string;
  is_issue_resolved: boolean;
  created_at: string;
}

export interface DepartmentFeedbackStats {
  department: string;
  total_feedbacks: number;
  average_rating: number;
  satisfaction_rate_percent: number;
  resolution_confirmed_percent: number;
  rating_distribution: Record<number, number>;
}

export const feedbackService = {
  submitFeedback: async (data: FeedbackSubmission): Promise<FeedbackDetail> => {
    const response = await api.post<FeedbackDetail>('/feedback/submit/', data);
    return response.data;
  },

  getMyFeedbacks: async (): Promise<FeedbackDetail[]> => {
    const response = await api.get<FeedbackDetail[]>('/feedback/my-feedbacks/');
    return response.data;
  },

  getComplaintFeedback: async (complaintPublicId: string): Promise<FeedbackDetail> => {
    const response = await api.get<FeedbackDetail>(`/feedback/complaint/${complaintPublicId}/`);
    return response.data;
  },

  getDepartmentFeedbackStats: async (category: string): Promise<DepartmentFeedbackStats> => {
    const response = await api.get<DepartmentFeedbackStats>(`/feedback/department/${category}/stats/`);
    return response.data;
  },

  getAuthorityFeedbackStats: async () => {
    const response = await api.get('/feedback/authority/stats/');
    return response.data;
  },

  getAuthorityFeedbacks: async (): Promise<FeedbackDetail[]> => {
    const response = await api.get<FeedbackDetail[]>('/feedback/authority/feedbacks/');
    return response.data;
  },
};

export default feedbackService;
