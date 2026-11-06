// BD brief enablement and limits (plan §5). One server-side eligibility function guards BOTH the capability flag on
// /api/me and every feature route, so a caller can never gain trial access by setting a browser flag manually and a
// stale browser can never bypass a disabled server. Capability discovery uses only this file: it never touches the
// bd_ tables or a model, so missing feature tables fail only BD routes, not /api/me or application boot.
import type { Env } from '../../env.ts';
import type { UserRow } from '../../db.ts';
import { LIMITS } from '../../../../../packages/bd-brief/src/types.ts';

/** BD_BRIEF_ENABLED is a deployment-configuration switch, default off. */
export function bdBriefEnabled(env: Env): boolean {
  return env.BD_BRIEF_ENABLED === '1';
}

/**
 * Whether this signed-in account may use the BD brief feature. Enabled AND the lowercased email appears in the
 * comma-separated BD_BRIEF_ALLOWLIST. An unset/empty allowlist makes NOBODY eligible: the trial is opt-in per
 * address, so a forgotten configuration fails closed instead of granting every approved account paid generations.
 * Approval itself is enforced upstream in index.ts, like every /api route.
 */
export function bdBriefEligible(env: Env, user: Pick<UserRow, 'email' | 'role'>): boolean {
  if (!bdBriefEnabled(env)) return false;
  if (env.BD_BRIEF_ADMIN_ONLY === '1' && user.role !== 'admin') return false;
  const raw = env.BD_BRIEF_ALLOWLIST?.trim();
  // fail closed: enabled without a list means the trial has no accounts yet, not "everyone"
  if (!raw) return false;
  const email = user.email.trim().toLowerCase();
  return raw.split(',').some((a) => a.trim().toLowerCase() === email);
}

/** Model for brief generation; kept separate from the architecture/pricing/proposal model settings (plan §8). */
export function bdBriefModel(env: Env): string {
  return env.BD_BRIEF_MODEL?.trim() || 'qwen3.8-flash';
}

/** Hard deadline of one generation, clamped 5 s .. 120 s. A garbled var falls back to the contract default. */
export function bdBriefDeadlineMs(env: Env): number {
  const raw = env.BD_BRIEF_DEADLINE_MS?.trim();
  if (raw === undefined || raw === '') return LIMITS.generationDeadlineMs;
  const d = Number(raw);
  return Number.isInteger(d) && d >= 5_000 && d <= 120_000 ? d : LIMITS.generationDeadlineMs;
}

/** Generations per account per UTC day, 0..1000; 0 disables generation. Separate from TURNS_PER_DAY (plan §8). */
export function bdBriefGenerationsPerUserDay(env: Env): number {
  const raw = env.BD_BRIEF_MAX_PER_USER_DAY?.trim();
  // An empty or garbled var must not read as 0 (which would switch generation off).
  if (raw === undefined || raw === '' || !/^\d{1,4}$/.test(raw)) return LIMITS.generationsPerUserDay;
  const n = Number(raw);
  return n >= 0 && n <= 1000 ? n : LIMITS.generationsPerUserDay;
}
