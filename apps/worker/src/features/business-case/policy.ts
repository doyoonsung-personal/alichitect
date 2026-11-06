import type { Env } from '../../env.ts';
import type { UserRow } from '../../db.ts';

/** Missing, malformed and false-like settings all leave the module disabled. */
export const businessCaseEnabled = (env: Pick<Env, 'BUSINESS_CASE_ENABLED'>): boolean => env.BUSINESS_CASE_ENABLED === '1';

/** One server-side gate for capability discovery and every module route. An
 * optional nonempty allowlist narrows access; the trial additionally requires admin. */
export function businessCaseEligible(env: Pick<Env, 'BUSINESS_CASE_ENABLED' | 'BUSINESS_CASE_ADMIN_ONLY' | 'BUSINESS_CASE_ALLOWLIST'>,
  user: Pick<UserRow, 'email' | 'role'>): boolean {
  if (!businessCaseEnabled(env)) return false;
  if (env.BUSINESS_CASE_ADMIN_ONLY === '1' && user.role !== 'admin') return false;
  const list = env.BUSINESS_CASE_ALLOWLIST?.trim();
  if (!list) return true;
  const email = user.email.trim().toLowerCase();
  return !!email && list.split(',').some(value => value.trim().toLowerCase() === email);
}
