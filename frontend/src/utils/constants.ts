export const REQUIRED_DEPARTMENTS = [
  { name: 'Road and Infrastructure', code: 'ROAD', icon: 'alt_route' },
  { name: 'Electricity', code: 'ELEC', icon: 'electric_bolt' },
  { name: 'Water Supply', code: 'WATER', icon: 'water_drop' },
  { name: 'Sanitation and Waste', code: 'SAN', icon: 'delete' },
  { name: 'Drainage and Sewerage', code: 'DRAIN', icon: 'plumbing' },
  { name: 'Parks and Environment', code: 'PARK', icon: 'park' },
  { name: 'Traffic and Public Safety', code: 'TRAF', icon: 'traffic' },
  { name: 'Municipal Administration', code: 'ADMIN', icon: 'account_balance' },
] as const;

export const COMPLAINT_CATEGORIES = [
  'ROAD',
  'ELECTRICITY',
  'WATER',
  'SANITATION',
  'DRAINAGE',
  'PARKS',
  'TRAFFIC',
  'OTHER',
] as const;

export const STATUS_COLORS = {
  PENDING: { bg: 'rgba(234,179,8,0.15)', text: '#fbbf24', border: 'rgba(234,179,8,0.3)', label: 'Pending' },
  ASSIGNED: { bg: 'rgba(168,85,247,0.15)', text: '#c084fc', border: 'rgba(168,85,247,0.3)', label: 'Assigned' },
  IN_PROGRESS: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)', label: 'In Progress' },
  RESOLVED: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', border: 'rgba(34,197,94,0.3)', label: 'Resolved' },
  REJECTED: { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.3)', label: 'Rejected' },
} as const;

export const PRIORITY_COLORS = {
  LOW: { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  MEDIUM: { text: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  HIGH: { text: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  CRITICAL: { text: '#f87171', bg: 'rgba(248,113,113,0.15)' },
} as const;
