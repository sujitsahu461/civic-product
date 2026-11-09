import type { Api } from './api/endpoints';
import type { Status } from './api/types';

export type ComplaintStats = { total: number; active: number; resolved: number };

const count = (api: Api, status?: Status) => api.complaints(1, { status }).then((p) => p.count);

/**
 * Exact counts across all pages, using the list's total for each status.
 * Active = pending, assigned or in progress. Resolved = resolved or closed.
 */
export async function loadStats(api: Api): Promise<ComplaintStats> {
  const [total, pending, assigned, inProgress, resolved, closed] = await Promise.all([
    count(api),
    count(api, 'PENDING'),
    count(api, 'ASSIGNED'),
    count(api, 'IN_PROGRESS'),
    count(api, 'RESOLVED'),
    count(api, 'CLOSED'),
  ]);
  return { total, active: pending + assigned + inProgress, resolved: resolved + closed };
}

export const ACTIVE: Status[] = ['PENDING', 'ASSIGNED', 'IN_PROGRESS'];
export const DONE: Status[] = ['RESOLVED', 'CLOSED'];
