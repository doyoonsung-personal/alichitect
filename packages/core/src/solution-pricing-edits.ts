import type { SolutionEstimate } from './solution-pricing.ts';

function billableRow(base: object, edit: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = { ...base };
  for (const field of ['label', 'period', 'basis', 'rateId', 'unit', 'unitUsd', 'source', 'quantityNote', 'quantity', 'factors']) {
    if (Object.hasOwn(edit, field)) row[field] = edit[field];
  }
  if ((edit.quantity !== undefined || edit.factors !== undefined) && edit.quantityNote === undefined) delete row.quantityNote;
  if (edit.basis && edit.basis !== 'catalog' && 'basis' in base && edit.basis !== base.basis &&
      (edit.unitUsd === undefined || !edit.unit || !edit.source)) throw new Error('changed price basis needs its own unit and source');
  if (row.basis !== 'catalog' && row.rateId !== 'workflow-typical') delete row.rateId;
  return row;
}

function updateNotes(original: string[], remove: unknown, add: unknown): string[] {
  const removals = remove ?? [], additions = add ?? [];
  if (!Array.isArray(removals) || !Array.isArray(additions) || !additions.every(x => typeof x === 'string') ||
      !removals.every(i => Number.isInteger(i) && i >= 0 && i < original.length)) throw new Error('invalid note changes');
  return [...new Set([...original.filter((_, i) => !removals.includes(i)), ...additions])];
}

/** All row and note indices refer to the original snapshot, including edits following a removal. */
export function applyPricingEdits(base: SolutionEstimate | undefined, raw: Record<string, unknown>) {
  if (!Array.isArray(raw.changes) || raw.changes.length > 80) throw new Error('invalid pricing changes');
  const prior = base?.items ?? [];
  const rows: (Record<string, unknown> | null)[] = prior.map(row => ({ ...row }));
  const touched = new Set<number>();
  for (const edit of raw.changes) {
    if (!edit || typeof edit !== 'object' || Array.isArray(edit)) throw new Error('invalid pricing edit');
    const index: unknown = edit.index;
    if (index == null) {
      if (edit.remove) throw new Error('removal requires an index');
      rows.push(billableRow({}, edit));
      continue;
    }
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= prior.length || touched.has(index)) {
      throw new Error('unknown or repeated pricing row');
    }
    touched.add(index);
    rows[index] = edit.remove === true ? null : billableRow(prior[index], edit);
  }
  return { items: rows.filter((row): row is Record<string, unknown> => row !== null),
    assumptions: updateNotes(base?.assumptions ?? [], raw.dropAssumptions, raw.addAssumptions),
    unknowns: updateNotes(base?.unknowns ?? [], raw.dropUnknowns, raw.addUnknowns) };
}
