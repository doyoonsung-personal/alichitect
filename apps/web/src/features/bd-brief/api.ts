// The BD brief module's typed fetch client (plan §7). It has NO app-state access: it only
// speaks the frozen HTTP contract over same-origin, cookie-authenticated paths under
// BD_BRIEF_API_PREFIX. Network failures become BdBriefApiError code 'internal'; aborts stay
// aborts so the controller can tell a cancellation from a failure. Every UX decision about a
// structured error (not-available, version-conflict, ...) belongs to the controller, not here.
import type {
  AddNoteRequest, AddNoteResponse, BdBriefApiErrorCode, CreateBriefRequest, CreateBriefResponse,
  GenerateHttpRequest, GenerateHttpResponse, GetBriefResponse, ListBriefsResponse,
  PatchBriefRequest, PatchBriefResponse,
  BriefSourceKind, ListDiscoveryBriefsResponse,
} from '@ali/bd-brief/types.ts';
import { BD_BRIEF_API_PREFIX } from '@ali/bd-brief/types.ts';

export interface ReqOpts {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface BdBriefApi {
  listBriefs(sourceKey: string, o?: ReqOpts, sourceKind?: BriefSourceKind): Promise<ListBriefsResponse>;
  createBrief(body: CreateBriefRequest, o?: ReqOpts): Promise<CreateBriefResponse>;
  getBrief(id: string, o?: ReqOpts): Promise<GetBriefResponse>;
  patchBrief(id: string, body: PatchBriefRequest, o?: ReqOpts): Promise<PatchBriefResponse>;
  addNote(id: string, body: AddNoteRequest, o?: ReqOpts): Promise<AddNoteResponse>;
  generate(id: string, body: GenerateHttpRequest, o?: ReqOpts): Promise<GenerateHttpResponse>;
  deleteBrief(id: string, o?: ReqOpts): Promise<void>;
}

export interface DiscoveryBriefApi extends BdBriefApi {
  listDiscoveryBriefs(o?: ReqOpts): Promise<ListDiscoveryBriefsResponse>;
}

const CODES: ReadonlySet<string> = new Set([
  'not-available', 'not-found', 'version-conflict', 'request-conflict', 'invalid-request',
  'limit-exceeded', 'generation-failed', 'method-not-allowed', 'internal',
]);

/** The worker's generation-failure reason (routes.ts: { error:'generation-failed', reason }). */
export type GenerationFailReason = 'timeout' | 'model' | 'validation';

const REASONS: ReadonlySet<string> = new Set(['timeout', 'model', 'validation']);

export class BdBriefApiError extends Error {
  code: BdBriefApiErrorCode;
  status: number;
  /** Only present on 'version-conflict': the server's current accepted version. */
  currentVersion?: number;
  /** Only present on 'generation-failed': why the model run failed, for a distinct message. */
  reason?: GenerationFailReason;

  constructor(code: BdBriefApiErrorCode, status: number, message?: string, currentVersion?: number, reason?: GenerationFailReason) {
    super(message && message.trim() ? message.trim() : code);
    this.name = 'BdBriefApiError';
    this.code = code;
    this.status = status;
    if (typeof currentVersion === 'number' && Number.isFinite(currentVersion)) this.currentVersion = currentVersion;
    if (reason) this.reason = reason;
  }
}

function isAbort(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

/** Parses { error, message?, currentVersion?, reason? }; an unparseable or unknown body degrades to 'internal'. */
async function toError(res: Response): Promise<BdBriefApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const code = typeof raw.error === 'string' && CODES.has(raw.error) ? (raw.error as BdBriefApiErrorCode) : 'internal';
  const message = typeof raw.message === 'string' ? raw.message : undefined;
  const currentVersion = typeof raw.currentVersion === 'number' ? raw.currentVersion : undefined;
  // the worker's failure bodies carry `reason` instead of `message` (routes.ts): keep it for the UI
  const reason = typeof raw.reason === 'string' && REASONS.has(raw.reason) ? (raw.reason as GenerationFailReason) : undefined;
  return new BdBriefApiError(code, res.status, message, currentVersion, reason);
}

export function createBdBriefApi(deps: { fetchImpl?: typeof fetch } = {}): DiscoveryBriefApi {
  async function call<T>(method: string, path: string, body?: unknown, o?: ReqOpts): Promise<T> {
    const f = o?.fetchImpl ?? deps.fetchImpl ?? globalThis.fetch;
    let res: Response;
    try {
      res = await f(BD_BRIEF_API_PREFIX + path, {
        method,
        // cookies carry the existing account authentication (plan §7); never cross-origin
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        ...(o?.signal ? { signal: o.signal } : {}),
      });
    } catch (err) {
      // an abort stays an abort; anything else (offline, DNS, CORS) is a network 'internal'
      if (isAbort(err, o?.signal)) throw err;
      throw new BdBriefApiError('internal', 0, err instanceof Error ? err.message : String(err));
    }
    if (!res.ok) throw await toError(res);
    if (res.status === 204) return undefined as T;
    if (!/application\/json/i.test(res.headers.get('Content-Type') ?? '')) throw new BdBriefApiError('internal', res.status, 'invalid-response');
    return (await res.json()) as T;
  }

  const briefPath = (id: string): string => `/briefs/${encodeURIComponent(id)}`;

  return {
    listBriefs: (sourceKey, o, sourceKind = 'browser-session') => call<ListBriefsResponse>('GET', `/briefs?sourceKey=${encodeURIComponent(sourceKey)}${sourceKind === 'discovery' ? '&sourceKind=discovery' : ''}`, undefined, o),
    listDiscoveryBriefs: (o) => call<ListDiscoveryBriefsResponse>('GET', '/discovery-briefs', undefined, o),
    createBrief: (body, o) => call<CreateBriefResponse>('POST', '/briefs', body, o),
    getBrief: (id, o) => call<GetBriefResponse>('GET', briefPath(id), undefined, o),
    patchBrief: (id, body, o) => call<PatchBriefResponse>('PATCH', briefPath(id), body, o),
    addNote: (id, body, o) => call<AddNoteResponse>('POST', `${briefPath(id)}/notes`, body, o),
    generate: (id, body, o) => call<GenerateHttpResponse>('POST', `${briefPath(id)}/generate`, body, o),
    deleteBrief: (id, o) => call<void>('DELETE', briefPath(id), undefined, o),
  };
}
