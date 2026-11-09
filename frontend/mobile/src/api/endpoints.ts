import { Platform } from 'react-native';
import type { Client } from './client';
import type {
  Captcha, ComplaintDetail, ComplaintSummary, HistoryEntry, NewComplaint, Notification, Page, Status, Tokens, User,
} from './types';

/** Server-side search and filters for the complaint list (a citizen only ever sees their own complaints). */
export type ComplaintFilter = { q?: string; status?: Status; category?: string };

async function appendPhoto(form: FormData, field: string, photo: { uri: string; name: string; type: string }) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(photo.uri)).blob();
    form.append(field, blob, photo.name);
  } else {
    form.append(field, { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  }
}

async function appendFile(form: FormData, field: string, file?: { uri: string; name: string; type: string }) {
  if (!file) return;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name);
  } else {
    form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
}

export function endpoints(c: Client) {
  const r = c.request;
  return {
    captcha: () => r<Captcha>('/auth/captcha/', { auth: false }),
    login: (email: string, password: string, captcha_key: string, captcha_code: string) =>
      r<{ user: User; tokens: Tokens }>('/auth/login/', {
        method: 'POST', auth: false, body: { email, password, captcha_key, captcha_code },
      }),
    register: (p: { email: string; password: string; full_name: string; phone?: string }) =>
      r<{ user: User; tokens: Tokens }>('/auth/register/', {
        method: 'POST', auth: false, body: { ...p, phone: p.phone || null },
      }),
    logout: (refresh: string) => r<void>('/auth/logout/', { method: 'POST', body: { refresh }, noRefresh: true }),
    forgotPassword: (email: string) =>
      r<{ detail: string }>('/auth/forgot-password/', { method: 'POST', auth: false, body: { email } }),
    me: () => r<User>('/auth/me/'),
    updateProfile: (p: Partial<Pick<User, 'full_name' | 'phone' | 'bio' | 'address'>>) =>
      r<User>('/users/profile/update/', { method: 'PATCH', body: p }),
    changePassword: (old_password: string, new_password: string, confirm_password: string) =>
      r<{ detail: string }>('/users/change-password/', { method: 'POST', body: { old_password, new_password, confirm_password } }),

    complaints: (page = 1, filter: ComplaintFilter = {}) =>
      r<Page<ComplaintSummary>>('/complaints/', { query: { page, q: filter.q || undefined, status: filter.status, category: filter.category } }),
    complaint: (id: string) => r<ComplaintDetail>(`/complaints/${id}/`),
    timeline: (id: string) => r<HistoryEntry[]>(`/complaints/${id}/timeline/`),
    track: (code: string) => r<ComplaintDetail>(`/complaints/track/${encodeURIComponent(code.trim())}/`),
    createComplaint: async (n: NewComplaint) => {
      const form = new FormData();
      form.append('title', n.title);
      form.append('description', n.description);
      if (n.category) form.append('category', n.category);
      if (n.priority) form.append('priority', n.priority);
      if (n.location_address) form.append('location_address', n.location_address);
      if (n.latitude != null) form.append('latitude', String(n.latitude));
      if (n.longitude != null) form.append('longitude', String(n.longitude));
      for (const p of n.photos ?? []) await appendPhoto(form, 'images', p);
      await appendFile(form, 'audio', n.audio);
      await appendFile(form, 'video', n.video);
      if (n.audio_duration != null) form.append('audio_duration', String(n.audio_duration));
      return r<ComplaintDetail>('/complaints/create/', { method: 'POST', form });
    },
    submitFeedback: (complaint_public_id: string, rating: number, comments: string, is_issue_resolved: boolean) =>
      r<unknown>('/feedback/submit/', {
        method: 'POST', body: { complaint_public_id, rating, comments, is_issue_resolved },
      }),

    notifications: () => r<{ unread_count: number; notifications: Notification[] }>('/notifications/'),
    markRead: (id: string) => r<unknown>(`/notifications/${id}/mark-read/`, { method: 'POST' }),
    markAllRead: () => r<unknown>('/notifications/mark-all-read/', { method: 'POST' }),
  };
}

export type Api = ReturnType<typeof endpoints>;
