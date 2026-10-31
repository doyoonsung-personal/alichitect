// Drafted by Qwen (qwen3.8-max) from a written spec; reviewed by Claude.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pct, mean, max, round, summary, histogram, shareBelow } from '../src/stats.ts';

describe('pct', () => {
  test('returns 0 for an empty list', () => {
    assert.equal(pct([], 0.5), 0);
  });

  test('returns the single value for a one-element list', () => {
    assert.equal(pct([42], 0.5), 42);
  });

  test('interpolates the median of an even-length list', () => {
    // sorted [1,2,3,4], p=0.5 => i=(4-1)*0.5=1.5, lo=1, hi=2 => 2+(3-2)*0.5=2.5
    assert.equal(pct([1, 2, 3, 4], 0.5), 2.5);
  });

  test('p=0 returns the minimum', () => {
    // sorted [10,20,30], i=0 => s[0]=10
    assert.equal(pct([10, 20, 30], 0), 10);
  });

  test('p=1 returns the maximum', () => {
    // sorted [10,20,30], i=2 => s[2]=30
    assert.equal(pct([10, 20, 30], 1), 30);
  });

  test('handles unsorted input correctly', () => {
    // [30,10,20] sorted => [10,20,30], p=0.5 => i=1 => 20
    assert.equal(pct([30, 10, 20], 0.5), 20);
  });

  test('does not mutate the input array', () => {
    const input = [3, 1, 2];
    const copy = [...input];
    pct(input, 0.5);
    assert.deepEqual(input, copy);
  });
});

describe('mean', () => {
  test('returns 0 for an empty list', () => {
    assert.equal(mean([]), 0);
  });

  test('computes the arithmetic mean', () => {
    // (2+4+6)/3 = 4
    assert.equal(mean([2, 4, 6]), 4);
  });
});

describe('max', () => {
  test('returns 0 for an empty list', () => {
    assert.equal(max([]), 0);
  });

  test('returns the largest value', () => {
    assert.equal(max([3, 7, 1]), 7);
  });
});

describe('round', () => {
  test('rounds to 2 decimal places by default', () => {
    // 3.14159 * 100 = 314.159 => Math.round => 314 / 100 = 3.14
    assert.equal(round(3.14159), 3.14);
  });

  test('rounds to explicit number of digits', () => {
    // 3.14159 * 1000 = 3141.59 => Math.round => 3142 / 1000 = 3.142
    assert.equal(round(3.14159, 3), 3.142);
  });
});

describe('summary', () => {
  test('returns correct fields rounded to requested digits', () => {
    // xs=[1,2,3,4,5], n=5
    // p50: i=(5-1)*0.5=2, s[2]=3 => round(3,1)=3
    // p95: i=(5-1)*0.95=3.8, lo=3,hi=4 => 4+(5-4)*0.8=4.8 => round(4.8,1)=4.8
    // max: 5 => round(5,1)=5
    // mean: 15/5=3 => round(3,1)=3
    const s = summary([1, 2, 3, 4, 5], 1);
    assert.equal(s.n, 5);
    assert.equal(s.p50, 3);
    assert.equal(s.p95, 4.8);
    assert.equal(s.max, 5);
    assert.equal(s.mean, 3);
  });

  test('uses 2 decimal places by default', () => {
    // xs=[1,2,3], mean=2, p50=2, p95: i=2*0.95=1.9 => 2+(3-2)*0.9=2.9, max=3
    const s = summary([1, 2, 3]);
    assert.equal(s.n, 3);
    assert.equal(s.p50, 2);
    assert.equal(s.p95, 2.9);
    assert.equal(s.max, 3);
    assert.equal(s.mean, 2);
  });
});

describe('histogram', () => {
  test('produces correct bucket keys in order for edges [25, 100]', () => {
    const h = histogram([], [25, 100]);
    const keys = Object.keys(h);
    assert.deepEqual(keys, ['<25', '25-100', '100+']);
  });

  test('every bucket key exists even when empty', () => {
    const h = histogram([], [25, 100]);
    assert.equal(h['<25'], 0);
    assert.equal(h['25-100'], 0);
    assert.equal(h['100+'], 0);
  });

  test('boundary value exactly 25 goes into "25-100"', () => {
    const h = histogram([25], [25, 100]);
    assert.equal(h['<25'], 0);
    assert.equal(h['25-100'], 1);
    assert.equal(h['100+'], 0);
  });

  test('boundary value exactly 100 goes into "100+"', () => {
    const h = histogram([100], [25, 100]);
    assert.equal(h['<25'], 0);
    assert.equal(h['25-100'], 0);
    assert.equal(h['100+'], 1);
  });

  test('counts values into correct buckets', () => {
    // 10 < 25 => "<25"; 50 >= 25 and < 100 => "25-100"; 200 >= 100 => "100+"
    const h = histogram([10, 50, 200], [25, 100]);
    assert.equal(h['<25'], 1);
    assert.equal(h['25-100'], 1);
    assert.equal(h['100+'], 1);
  });
});

describe('shareBelow', () => {
  test('returns 0 for empty input', () => {
    assert.equal(shareBelow([], 10), 0);
  });

  test('computes fraction strictly below threshold', () => {
    // [1,5,10,15], t=10 => strictly below: 1,5 => 2/4 = 0.5
    assert.equal(shareBelow([1, 5, 10, 15], 10), 0.5);
  });

  test('excludes values equal to threshold', () => {
    // [10,10,10], t=10 => none strictly below => 0
    assert.equal(shareBelow([10, 10, 10], 10), 0);
  });
});
