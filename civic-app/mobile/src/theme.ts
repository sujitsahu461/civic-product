import type { Priority, Status } from './api/types';

/** Same palette as the CivicSetu website (kesari, maroon, haldi on a warm paper background). */
export const colors = {
  bg: '#FBF9F5',
  card: '#FFFFFF',
  ink: '#1B2533',
  muted: '#667085',
  line: '#E7E1D6',
  kesari: '#D9650B',
  maroon: '#7A1F2B',
  haldi: '#F2B705',
  ok: '#1F6B3F',
  danger: '#B42318',
};

export const statusStyle: Record<Status, { label: string; fg: string; bg: string }> = {
  PENDING: { label: 'Pending', fg: '#8A5A00', bg: '#FDF0C4' },
  ASSIGNED: { label: 'Assigned', fg: '#1D4E89', bg: '#E1ECF9' },
  IN_PROGRESS: { label: 'In progress', fg: '#1D4E89', bg: '#E1ECF9' },
  RESOLVED: { label: 'Resolved', fg: '#1F6B3F', bg: '#E3F4E8' },
  REJECTED: { label: 'Rejected', fg: '#B42318', bg: '#FCE8E6' },
  CLOSED: { label: 'Closed', fg: '#475467', bg: '#EEF0F3' },
};

export const priorityLabel: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };

export const categories: { value: string; label: string }[] = [
  { value: 'ROAD', label: 'Road' },
  { value: 'WATER', label: 'Water' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'STREET_LIGHT', label: 'Street light' },
  { value: 'GARBAGE', label: 'Garbage' },
  { value: 'SANITATION', label: 'Sanitation' },
  { value: 'DRAINAGE', label: 'Drainage' },
  { value: 'PARKS', label: 'Parks' },
  { value: 'NOISE', label: 'Noise' },
  { value: 'OTHER', label: 'Other' },
];

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
