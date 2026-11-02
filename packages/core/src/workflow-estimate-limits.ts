// Bounds on the client-held estimate settings. Admission enforces them, so the cost editor must use the same ones.
export const ESTIMATE_LIMITS = {
  /** runsPerMonth, an integer. */
  runsPerMonth: 1e9,
  /** Every other numeric override: tokens, item and loop counts, agent requests and searches. */
  amount: 1e9,
  /** A branch share is a fraction of runs. */
  share: 1,
  /** guardTypes, an integer: how many guard checks a guard step runs. */
  guardTypes: 3,
} as const;
