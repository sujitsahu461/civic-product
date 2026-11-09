import { create } from 'zustand';
import {
  Complaint,
  ComplaintFilterParams,
  ComplaintHistory,
  SubmitComplaintPayload,
} from '../types/complaint';
import { complaintService } from '../services/complaint.service';

interface ComplaintStore {
  complaints: Complaint[];
  totalCount: number;
  selectedComplaint: Complaint | null;
  timeline: ComplaintHistory[];
  notifications: any[];
  unreadNotificationsCount: number;
  isLoading: boolean;
  error: string | null;

  fetchComplaints: (params?: ComplaintFilterParams, silent?: boolean) => Promise<void>;
  fetchComplaintById: (publicId: string) => Promise<Complaint>;
  trackComplaint: (code: string, silent?: boolean) => Promise<Complaint>;
  fetchTimeline: (publicId: string) => Promise<ComplaintHistory[]>;
  submitComplaint: (payload: SubmitComplaintPayload) => Promise<Complaint>;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (publicId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearSelectedComplaint: () => void;
  resetState: () => void;
}

function formatApiError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  if (data.non_field_errors) {
    return Array.isArray(data.non_field_errors) ? data.non_field_errors.join(', ') : String(data.non_field_errors);
  }
  if (typeof data === 'object') {
    const errorMessages: string[] = [];
    for (const [key, val] of Object.entries(data)) {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      if (Array.isArray(val)) {
        errorMessages.push(`${formattedKey}: ${val.join(', ')}`);
      } else if (typeof val === 'object' && val !== null) {
        const nested = Object.values(val).flat().join(', ');
        errorMessages.push(`${formattedKey}: ${nested}`);
      } else if (typeof val === 'string') {
        errorMessages.push(`${formattedKey}: ${val}`);
      }
    }
    if (errorMessages.length > 0) return errorMessages.join(' | ');
  }
  return err?.message || fallback;
}

export const useComplaintStore = create<ComplaintStore>((set) => ({
  complaints: [],
  totalCount: 0,
  selectedComplaint: null,
  timeline: [],
  notifications: [],
  unreadNotificationsCount: 0,
  isLoading: false,
  error: null,

  clearSelectedComplaint: () => set({ selectedComplaint: null, timeline: [] }),
  resetState: () =>
    set({
      complaints: [],
      totalCount: 0,
      selectedComplaint: null,
      timeline: [],
      notifications: [],
      unreadNotificationsCount: 0,
      isLoading: false,
      error: null,
    }),

  fetchComplaints: async (params, silent = false) => {
    if (!silent) set({ isLoading: true, error: null });
    try {
      const data = await complaintService.getComplaints(params);
      if (Array.isArray(data)) {
        set({ complaints: data, totalCount: data.length, isLoading: false });
      } else if (data?.results) {
        set({ complaints: data.results, totalCount: data.count || data.results.length, isLoading: false });
      } else {
        set({ complaints: [], totalCount: 0, isLoading: false });
      }
    } catch (err: any) {
      if (!silent) set({ error: formatApiError(err, 'Failed to fetch complaints'), isLoading: false });
    }
  },

  fetchComplaintById: async (publicId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await complaintService.getComplaintById(publicId);
      set({ selectedComplaint: data, isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: formatApiError(err, 'Failed to fetch complaint details'), isLoading: false });
      throw err;
    }
  },

  trackComplaint: async (code: string, silent = false) => {
    if (!silent) set({ isLoading: true, error: null });
    try {
      const data = await complaintService.trackComplaint(code);
      set({ selectedComplaint: data, isLoading: false });
      return data;
    } catch (err: any) {
      if (!silent) set({ error: formatApiError(err, 'Complaint not found with this tracking code'), isLoading: false });
      throw err;
    }
  },

  fetchTimeline: async (publicId: string) => {
    try {
      const timeline = await complaintService.getComplaintTimeline(publicId);
      set({ timeline });
      return timeline;
    } catch (err: any) {
      return [];
    }
  },

  submitComplaint: async (payload: SubmitComplaintPayload) => {
    set({ isLoading: true, error: null });
    try {
      const created = await complaintService.submitComplaint(payload);
      set((state) => ({
        complaints: [created, ...state.complaints],
        totalCount: state.totalCount + 1,
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      const msg = formatApiError(err, 'Failed to file grievance. Please check your inputs.');
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchNotifications: async () => {
    try {
      const data = await complaintService.getNotifications();
      set({
        notifications: data.notifications || [],
        unreadNotificationsCount: data.unread_count || 0,
      });
    } catch {
      // Ignore notification fetch failure gracefully
    }
  },

  markNotificationAsRead: async (publicId: string) => {
    try {
      await complaintService.markNotificationAsRead(publicId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.public_id === publicId ? { ...n, is_read: true } : n
        ),
        unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1),
      }));
    } catch {}
  },

  markAllNotificationsAsRead: async () => {
    try {
      await complaintService.markAllNotificationsAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadNotificationsCount: 0,
      }));
    } catch {}
  },
}));

export default useComplaintStore;
