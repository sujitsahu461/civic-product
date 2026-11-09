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

// Kesari + Maroon + Haldi palette, for light (ivory/white) backgrounds.
// Pending = haldi, assigned = maroon, in progress = kesari tint with maroon text,
// resolved = green, rejected = red.
export const STATUS_COLORS = {
  PENDING: { bg: '#FDF0C4', text: '#6B4E00', border: '#F4C430', label: 'Pending' },
  ASSIGNED: { bg: '#F6E3E5', text: '#7A1F2B', border: '#E4BCC1', label: 'Assigned' },
  IN_PROGRESS: { bg: '#FFE8D6', text: '#7A1F2B', border: '#FFC9A3', label: 'In Progress' },
  RESOLVED: { bg: '#E6F4EA', text: '#1F6B3F', border: '#B7DEC3', label: 'Resolved' },
  REJECTED: { bg: '#FDECEA', text: '#B42318', border: '#F5C2BC', label: 'Rejected' },
} as const;

// Low = neutral, medium = haldi, high = deep kesari, critical = red.
export const PRIORITY_COLORS = {
  LOW: { text: '#5A4033', bg: '#F3EEE8' },
  MEDIUM: { text: '#6B4E00', bg: '#FDF0C4' },
  HIGH: { text: '#B93E0C', bg: '#FFE8D6' },
  CRITICAL: { text: '#B42318', bg: '#FDECEA' },
} as const;
