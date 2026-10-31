// Small pure statistics helpers shared by the metric modules.

/** Linear-interpolated percentile (p in 0..1) of an unsorted list; 0 for an empty list. */
export function pct(xs: readonly number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function max(xs: readonly number[]): number {
  return xs.length ? Math.max(...xs) : 0;
}

export const round = (x: number, d = 2): number => {
  const f = 10 ** d;
  return Math.round(x * f) / f;
};

/** Summary of a sample: n, p50, p95, max, mean (rounded). */
export interface Summary {
  n: number;
  p50: number;
  p95: number;
  max: number;
  mean: number;
}

export function summary(xs: readonly number[], d = 2): Summary {
  return { n: xs.length, p50: round(pct(xs, 0.5), d), p95: round(pct(xs, 0.95), d), max: round(max(xs), d), mean: round(mean(xs), d) };
}

/**
 * Counts per bucket. `edges` are ascending lower bounds after the first bucket: edges [25, 100] gives buckets
 * "<25", "25-100", "100+". Keys keep that order.
 */
export function histogram(xs: readonly number[], edges: readonly number[]): Record<string, number> {
  const keys: string[] = [];
  for (let i = 0; i <= edges.length; i++) {
    if (i === 0) keys.push(`<${edges[0]}`);
    else if (i === edges.length) keys.push(`${edges[i - 1]}+`);
    else keys.push(`${edges[i - 1]}-${edges[i]}`);
  }
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = 0;
  for (const x of xs) {
    let i = 0;
    while (i < edges.length && x >= edges[i]) i++;
    out[keys[i]]++;
  }
  return out;
}

/** Share of xs below a threshold, as a fraction 0..1 (0 for an empty list). */
export function shareBelow(xs: readonly number[], t: number): number {
  return xs.length ? xs.filter((x) => x < t).length / xs.length : 0;
}
