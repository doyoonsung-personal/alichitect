import { t, type Lang } from '../i18n/t.ts';
import { emptyRevision } from '../store/reducer.ts';
import { reviveSession } from '../store/sessions.ts';
import type { SessionRecord } from '../store/types.ts';

export async function importAgentDesign(id: string, fresh: SessionRecord, lang: Lang, request = fetch): Promise<SessionRecord> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Invalid design ID');
  const response = await request('/api/agent-designs/' + encodeURIComponent(id), { cache: 'no-store' });
  if (!response.ok) throw new Error('Design unavailable');
  const data = await response.json();
  if (data.designId !== id || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new Error('Invalid revision');
  const rev = emptyRevision(1, data.title, data.updatedAt);
  rev.status = 'done';
  rev.note = data.summary;
  rev.mode = data.mode;
  const title = data.title + ' · ' + t(lang, 'account.agentCopy', { n: data.revision });
  const record = reviveSession({
    ...fresh, title, titleVersion: data.titleVersion, memory: data.memory, mode: data.mode, revisions: [rev],
    pricing: data.pricing, updatedAt: data.updatedAt
  });
  if (!record) throw new Error('Invalid design snapshot');
  return record;
}
