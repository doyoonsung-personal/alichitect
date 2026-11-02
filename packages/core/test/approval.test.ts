import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPROVAL_POLICY, needsApproval, waived, approvalRuleText } from '../src/approval.ts';
import type { Effect, WorkflowNode } from '../src/types.ts';
const node = (effect?: Effect): WorkflowNode => ({ id: 'action', kind: 'tool', label: 'Action', ...(effect ? { effect } : {}) });
for (const effect of Object.keys(APPROVAL_POLICY) as Effect[]) test(`approval policy for ${effect}`, () => {
  const expected = ['send', 'publish', 'pay', 'delete', 'admin', 'decide'].includes(effect);
  assert.equal(APPROVAL_POLICY[effect].approval, expected); assert.equal(needsApproval(node(effect)), expected);
  assert.ok(APPROVAL_POLICY[effect].text);
  assert.equal(approvalRuleText().includes(`${effect} (`), expected);
});
test('approval overrides follow step, on, off, default order', () => {
  const n = node('send');
  assert.equal(needsApproval(n, { approvalOff: ['send'] }), false);
  assert.equal(needsApproval(n, { approvalOff: ['send'], approvalOn: ['send'] }), true);
  assert.equal(needsApproval({ ...n, approval: 'skip' }, { approvalOn: ['send'] }), false);
  assert.equal(needsApproval({ ...n, approval: 'required' }, { approvalOff: ['send'] }), true);
  assert.equal(needsApproval(node()), false); assert.equal(needsApproval({ ...node(), kind: 'act' }), true);
  assert.equal(needsApproval({ ...node(), approval: 'required' }), true);
});
test('waived means a default approval was turned off', () => {
  assert.equal(waived(node('send')), false);
  assert.equal(waived(node('send'), { approvalOff: ['send'] }), true);
  assert.equal(waived({ ...node('send'), approval: 'skip' }), true);
  assert.equal(waived(node('reply'), { approvalOff: ['reply'] }), false);
  assert.equal(waived(node('send'), { approvalOff: ['send'], approvalOn: ['send'] }), false);
});
test('policy has exactly the ten effects and waivers respect explicit required', () => {
  assert.deepEqual(Object.keys(APPROVAL_POLICY).sort(), ['read', 'write', 'reply', 'notify', 'send', 'publish', 'pay', 'delete', 'admin', 'decide'].sort());
  assert.equal(waived({ ...node('send'), approval: 'required' }, { approvalOff: ['send'] }), false);
  assert.equal(waived({ ...node(), kind: 'act' }, { approvalOff: ['send'] }), true);
  assert.equal(waived(node()), false);
  assert.equal(needsApproval(node('read'), { approvalOn: ['read'] }), true);
  assert.equal(waived(node('read'), { approvalOn: ['read'] }), false);
  assert.equal(approvalRuleText().includes('\n'), false);
});
