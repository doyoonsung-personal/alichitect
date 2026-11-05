import type { Env } from '../../env.ts';

/** Missing, malformed and false-like settings all leave the module disabled. */
export const businessCaseEnabled = (env: Pick<Env, 'BUSINESS_CASE_ENABLED'>): boolean => env.BUSINESS_CASE_ENABLED === '1';
