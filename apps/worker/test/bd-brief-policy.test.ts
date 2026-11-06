// Plan §5: one server-side eligibility function for capability advertising and every route; typed accessors with
// safe fallbacks so a garbled var can never disable generation silently or remove the deadline clamp.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIMITS } from '../../../packages/bd-brief/src/types.ts';
import { bdBriefDeadlineMs, bdBriefEligible, bdBriefEnabled, bdBriefGenerationsPerUserDay, bdBriefModel } from '../src/features/bd-brief/policy.ts';
import { makeEnv } from './helpers.ts';
import type { Env } from '../src/env.ts';

const user = (email: string): { email: string; role: 'user' } => ({ email, role: 'user' });

test('flag off: nobody is eligible, whatever the allowlist says', () => {
  const env = makeEnv();
  assert.equal(bdBriefEnabled(env), false);
  assert.equal(bdBriefEligible(env, user('a@example.com')), false);
  const withList = makeEnv({ BD_BRIEF_ALLOWLIST: 'a@example.com' });
  assert.equal(bdBriefEligible(withList, user('a@example.com')), false, 'the allowlist alone grants nothing');
});

test('flag on, allowlist unset or empty: NOBODY is eligible (the trial fails closed)', () => {
  for (const over of [{ BD_BRIEF_ENABLED: '1' }, { BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: '' }, { BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: '  ' }] as Array<Partial<Env>>) {
    const env = makeEnv(over);
    assert.equal(bdBriefEligible(env, user('anyone@example.com')), false, JSON.stringify(over));
    assert.equal(bdBriefEligible(env, user('dysung.alicloud@gmail.com')), false, 'not even the admin without an explicit listing');
  }
});

test('flag on with an allowlist: only the listed emails, case-insensitively', () => {
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: ' Mina@Example.com ,boss@corp.kr' });
  assert.equal(bdBriefEligible(env, user('mina@example.com')), true);
  assert.equal(bdBriefEligible(env, user('MINA@EXAMPLE.COM')), true);
  assert.equal(bdBriefEligible(env, user('boss@corp.kr')), true);
  assert.equal(bdBriefEligible(env, user('other@example.com')), false);
  // a substring or superstring of a listed address is not listed
  assert.equal(bdBriefEligible(env, user('ina@example.com')), false);
});

test('BD_BRIEF_ENABLED must be exactly "1"', () => {
  for (const v of ['true', 'yes', ' 1', '01']) {
    assert.equal(bdBriefEnabled(makeEnv({ BD_BRIEF_ENABLED: v })), false, v);
  }
});

test('admin-only trials require admin role even when ordinary and verified users are allowlisted', () => {
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ADMIN_ONLY: '1', BD_BRIEF_ALLOWLIST: 'trial@example.com' });
  for (const role of ['user', 'verified'] as const) assert.equal(bdBriefEligible(env, { email: 'trial@example.com', role }), false);
  assert.equal(bdBriefEligible(env, { email: 'TRIAL@EXAMPLE.COM', role: 'admin' }), true);
  assert.equal(bdBriefEligible(env, { email: 'other@example.com', role: 'admin' }), false);
  env.BD_BRIEF_ALLOWLIST = '';
  assert.equal(bdBriefEligible(env, { email: 'trial@example.com', role: 'admin' }), false, 'admin status does not bypass the fail-closed allowlist');
});

test('bdBriefModel: default qwen3.8-flash, trimmed override', () => {
  assert.equal(bdBriefModel(makeEnv()), 'qwen3.8-flash');
  assert.equal(bdBriefModel(makeEnv({ BD_BRIEF_MODEL: '' })), 'qwen3.8-flash');
  assert.equal(bdBriefModel(makeEnv({ BD_BRIEF_MODEL: '  qwen3.8-max ' })), 'qwen3.8-max');
});

test('bdBriefDeadlineMs: default, clamp to 5 s..120 s, garbled falls back', () => {
  assert.equal(bdBriefDeadlineMs(makeEnv()), LIMITS.generationDeadlineMs);
  assert.equal(bdBriefDeadlineMs(makeEnv({ BD_BRIEF_DEADLINE_MS: '' })), LIMITS.generationDeadlineMs);
  assert.equal(bdBriefDeadlineMs(makeEnv({ BD_BRIEF_DEADLINE_MS: '10000' })), 10_000);
  assert.equal(bdBriefDeadlineMs(makeEnv({ BD_BRIEF_DEADLINE_MS: '5000' })), 5_000);
  assert.equal(bdBriefDeadlineMs(makeEnv({ BD_BRIEF_DEADLINE_MS: '120000' })), 120_000);
  for (const v of ['4999', '120001', '-1', 'abc', '1.5', '1e9']) {
    assert.equal(bdBriefDeadlineMs(makeEnv({ BD_BRIEF_DEADLINE_MS: v })), LIMITS.generationDeadlineMs, v);
  }
});

test('bdBriefGenerationsPerUserDay: default, 0 disables, out-of-range and garbled fall back', () => {
  assert.equal(bdBriefGenerationsPerUserDay(makeEnv()), LIMITS.generationsPerUserDay);
  assert.equal(bdBriefGenerationsPerUserDay(makeEnv({ BD_BRIEF_MAX_PER_USER_DAY: '' })), LIMITS.generationsPerUserDay, 'empty must not read as 0');
  assert.equal(bdBriefGenerationsPerUserDay(makeEnv({ BD_BRIEF_MAX_PER_USER_DAY: '0' })), 0);
  assert.equal(bdBriefGenerationsPerUserDay(makeEnv({ BD_BRIEF_MAX_PER_USER_DAY: '1000' })), 1000);
  for (const v of ['1001', '-3', 'abc', '2.5', ' 7 ']) {
    assert.equal(bdBriefGenerationsPerUserDay(makeEnv({ BD_BRIEF_MAX_PER_USER_DAY: v })), v === ' 7 ' ? 7 : LIMITS.generationsPerUserDay, v);
  }
});
