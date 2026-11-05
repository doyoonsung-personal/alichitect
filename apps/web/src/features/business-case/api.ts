import { validateDocument, validateExplanation } from '../../../../../packages/business-case/src/engine.ts';
import type { BusinessCaseDocument, BusinessCaseExplanation, BusinessCaseLang, BusinessCaseRecord } from '../../../../../packages/business-case/src/types.ts';

const PREFIX = '/api/features/business-case';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export class BusinessCaseError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.name = 'BusinessCaseError'; this.status = status; }
}
export function parseRecord(value: unknown, sessionId: string): BusinessCaseRecord | null {
  if (!object(value) || typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.id) ||
      typeof value.createdAt !== 'number' || !Number.isSafeInteger(value.createdAt) || value.createdAt < 0 || value.createdAt > 8.64e15) return null;
  const document = validateDocument(value.document);
  if (!document.ok || document.value.source.sessionId !== sessionId) return null;
  return { id: value.id, createdAt: value.createdAt, document: document.value };
}
export function parseRecords(value: unknown, sessionId: string): BusinessCaseRecord[] | null {
  if (!object(value) || !Array.isArray(value.records) || value.records.length > 20) return null;
  const records = value.records.map(item => parseRecord(item, sessionId));
  return records.every((item): item is BusinessCaseRecord => item !== null) ? records : null;
}

export interface BusinessCaseVersionSummary { id: string; sessionId: string; title: string; createdAt: number }
/** Account-wide metadata only: no document from another session is accepted or imported here. */
export function parseVersionSummaries(value: unknown): BusinessCaseVersionSummary[] | null {
  if (!object(value) || !Array.isArray(value.versions) || value.versions.length > 200) return null;
  const seen = new Set<string>();
  const versions: BusinessCaseVersionSummary[] = [];
  for (const item of value.versions) {
    if (!object(item) || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(item.id) || seen.has(item.id) ||
        typeof item.sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(item.sessionId) ||
        typeof item.title !== 'string' || item.title.length > 240 ||
        typeof item.createdAt !== 'number' || !Number.isSafeInteger(item.createdAt) || item.createdAt < 0 || item.createdAt > 8.64e15) return null;
    seen.add(item.id);
    versions.push({ id: item.id, sessionId: item.sessionId, title: item.title, createdAt: item.createdAt });
  }
  return versions;
}

export interface ApiOptions { signal?: AbortSignal; fetchImpl?: typeof fetch; timeoutMs?: number }
async function request(path: string, method: string, body: unknown, options: ApiOptions): Promise<unknown> {
  const ac = new AbortController();
  const abort = () => ac.abort();
  if (options.signal?.aborted) ac.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, options.timeoutMs ?? 40_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(`${PREFIX}${path}`, {
      method, signal: ac.signal, credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new BusinessCaseError(response.status, 'business-case-request-failed');
    if (response.status === 204) return null;
    if (!/application\/json/i.test(response.headers.get('Content-Type') ?? '')) throw new BusinessCaseError(502, 'invalid-response');
    return await response.json();
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export async function listVersions(sessionId: string, options: ApiOptions = {}): Promise<BusinessCaseRecord[]> {
  const parsed = parseRecords(await request(`?sessionId=${encodeURIComponent(sessionId)}`, 'GET', undefined, options), sessionId);
  if (!parsed) throw new BusinessCaseError(502, 'invalid-response');
  return parsed;
}
export async function listAllVersions(options: ApiOptions = {}): Promise<BusinessCaseVersionSummary[]> {
  const parsed = parseVersionSummaries(await request('/versions', 'GET', undefined, options));
  if (!parsed) throw new BusinessCaseError(502, 'invalid-response');
  return parsed;
}
export async function saveVersion(document: BusinessCaseDocument, options: ApiOptions = {}): Promise<BusinessCaseRecord> {
  const data = await request('', 'POST', { document }, options);
  const parsed = object(data) ? parseRecord(data.record, document.source.sessionId) : null;
  if (!parsed) throw new BusinessCaseError(502, 'invalid-response');
  return parsed;
}
export async function deleteVersion(id: string, options: ApiOptions = {}): Promise<void> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new BusinessCaseError(400, 'invalid-id');
  await request(`/${encodeURIComponent(id)}`, 'DELETE', undefined, options);
}
export async function explainCase(document: BusinessCaseDocument, lang: BusinessCaseLang, options: ApiOptions = {}): Promise<BusinessCaseExplanation> {
  const data = await request('/explain', 'POST', { document, lang }, options);
  const explanation = object(data) ? validateExplanation(data.explanation) : null;
  if (!explanation) throw new BusinessCaseError(502, 'invalid-response');
  return explanation;
}
