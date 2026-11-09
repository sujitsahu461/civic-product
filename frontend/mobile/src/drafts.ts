import { files } from './api/storage';
import type { NewComplaint } from './api/types';

/**
 * Offline drafts. A draft is only removed after the server confirms the complaint.
 * UNKNOWN means the request may or may not have reached the server (timeout or lost connection).
 * The backend has no duplicate-request protection yet, so an UNKNOWN draft is never resent automatically.
 */
export type DraftState = 'PENDING' | 'FAILED' | 'UNKNOWN';
export type Draft = { id: string; owner: string; state: DraftState; note: string; updatedAt: string; data: NewComplaint };

const FILE = 'civicsetu-drafts.json';

async function readAll(): Promise<Draft[]> {
  const raw = await files.read(FILE);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Draft[];
  } catch {
    return [];
  }
}

export async function listDrafts(owner: string): Promise<Draft[]> {
  return (await readAll()).filter((d) => d.owner === owner).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveDraft(owner: string, data: NewComplaint, state: DraftState, note: string, id?: string): Promise<Draft> {
  const all = await readAll();
  const draft: Draft = {
    id: id ?? `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    owner, state, note, updatedAt: new Date().toISOString(), data,
  };
  await files.write(FILE, JSON.stringify([...all.filter((d) => d.id !== draft.id), draft]));
  return draft;
}

export async function deleteDraft(id: string): Promise<void> {
  await files.write(FILE, JSON.stringify((await readAll()).filter((d) => d.id !== id)));
}
