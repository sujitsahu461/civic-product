import api from './api';

export interface AIClassificationResult {
  predicted_category: string;
  confidence_score: number;
  urgency_score: number;
  predicted_priority: string;
  predicted_department?: string;
  requires_human_review?: boolean;
  department_routing?: {
    predicted_department: string;
    db_department_name: string;
    confidence_score: number;
    decision_source: string;
    requires_human_review: boolean;
    cross_check_status: string;
    flag_reason?: string | null;
    ml_predicted_department: string;
    probabilities: Record<string, number>;
  };
  detected_keywords: string[];
  hazard_tags: string[];
  sentiment: string;
  estimated_resolution_hours: number;
  ml_priority_details?: Record<string, any>;
}


export interface DuplicateMatch {
  complaint_public_id: string;
  tracking_code: string;
  title: string;
  status: string;
  location_address: string;
  distance_km: number | null;
  similarity_score: number;
  match_confidence: string;
  matched_tokens: string[];
}

export interface AICityInsights {
  total_ai_scans: number;
  average_urgency_index: number;
  high_hazard_alerts_count: number;
  top_predicted_categories: Array<{ predicted_category: string; count: number }>;
  category_distribution: Array<{ category: string; total: number }>;
  system_readiness_status: string;
  model_version: string;
  last_updated: string;
}

export const aiService = {
  classifyComplaint: async (title: string, description: string, locationAddress?: string): Promise<AIClassificationResult> => {
    const response = await api.post<AIClassificationResult>('/ai/classify/', {
      title,
      description,
      location_address: locationAddress || '',
    });
    return response.data;
  },

  detectDuplicates: async (
    title: string,
    description: string,
    category: string,
    latitude?: number | null,
    longitude?: number | null,
    radiusKm: number = 1.5
  ): Promise<DuplicateMatch[]> => {
    const response = await api.post<DuplicateMatch[]>('/ai/detect-duplicates/', {
      title,
      description,
      category,
      latitude,
      longitude,
      radius_km: radiusKm,
    });
    return response.data;
  },

  getCityInsights: async (): Promise<AICityInsights> => {
    const response = await api.get<AICityInsights>('/ai/city-insights/');
    return response.data;
  },

  getComplaintPrediction: async (complaintPublicId: string): Promise<AIClassificationResult> => {
    const response = await api.get<AIClassificationResult>(`/ai/complaint/${complaintPublicId}/prediction/`);
    return response.data;
  },
};

export default aiService;
