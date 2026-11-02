// Who approves what in a designed workflow (research/ai-workflows/PLAN.md D9): one table, read by the workflow checks
// and, from phase 4, by the workflow prompt, so the two can't disagree. Browser-safe.
import type { Effect, WorkflowNode, WorkflowSettings } from './types.ts';

export const APPROVAL_POLICY: Readonly<Record<Effect, { approval: boolean; text: string }>> = {
  read: { approval: false, text: 'look up an order, search the web' },
  write: { approval: false, text: 'update a ticket field, add a CRM note' },
  reply: { approval: false, text: 'answer inside a live conversation the user is in (chat, voice)' },
  notify: { approval: false, text: 'page the on-call engineer, post to an internal channel' },
  send: { approval: true, text: 'email or message a third party outside the conversation' },
  publish: { approval: true, text: 'post public content or social replies' },
  pay: { approval: true, text: 'refund, payout, booking or any financial commitment' },
  delete: { approval: true, text: 'irreversible removal' },
  admin: { approval: true, text: 'production change, access rights, rollback' },
  decide: { approval: true, text: 'a decision with legal or similar effect on a person: deny a claim, reject a candidate' },
};
export function needsApproval(node: WorkflowNode, settings: WorkflowSettings = {}): boolean {
  if (node.approval) return node.approval === 'required';
  const effect = node.effect ?? (node.kind === 'act' ? 'send' : undefined);
  if (!effect) return false;
  if (settings.approvalOn?.includes(effect)) return true;
  if (settings.approvalOff?.includes(effect)) return false;
  return APPROVAL_POLICY[effect].approval;
}
export function waived(node: WorkflowNode, settings?: WorkflowSettings): boolean {
  const effect = node.effect ?? (node.kind === 'act' ? 'send' : undefined);
  return !!effect && APPROVAL_POLICY[effect].approval && !needsApproval(node, settings);
}
export function approvalRuleText(): string {
  return `Require approval for ${Object.entries(APPROVAL_POLICY).filter(([, p]) => p.approval).map(([e, p]) => `${e} (${p.text})`).join('; ')}.`;
}
