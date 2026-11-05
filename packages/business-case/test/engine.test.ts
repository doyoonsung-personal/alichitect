import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateBusinessCase, defaultInputs, validateDocument, validateExplanation } from '../src/engine.ts';
import type { BusinessCaseDocument, ScenarioId } from '../src/types.ts';

function fixture(): BusinessCaseDocument {
  return {
    schemaVersion: 1,
    source: {
      sessionId: 'session-test', title: 'Inventory assistance', capturedAt: 1_793_800_000_000,
      designFingerprint: 'design-hash', estimateFingerprint: 'estimate-hash', estimateStatus: 'current',
      monthlyUsd: 500, oneTimeUsd: 1000, context: 'Customer wants to reduce manual reconciliation.',
      caveats: ['Usage is not yet measured.'],
    },
    inputs: {
      ...defaultInputs(), baselineMonthlyCostUsd: 1000, retiredMonthlyCostUsd: 200,
      manualHoursMonthly: 100, loadedHourlyCostUsd: 40,
      additionalRecurringMonthlyUsd: 100, additionalImplementationUsd: 200,
      evidence: 'Customer supplied current costs; efficiency and cash conversion await validation.',
      scenarios: defaultInputs().scenarios.map(s => ({ ...s, cashRealizationPct: 50, additionalBenefitMonthlyUsd: 150 })),
    },
  };
}
const scenario = (d: BusinessCaseDocument, id: ScenarioId = 'expected') => calculateBusinessCase(d).scenarios.find(s => s.id === id)!;

test('calculates incremental cash, capacity, ROI and horizon break-even without counting the full baseline as savings', () => {
  const doc = fixture();
  const r = calculateBusinessCase(doc);
  assert.equal(r.baselineMonthlyUsd, 5000);
  assert.equal(r.solutionMonthlyUsd, 600);
  assert.equal(r.investmentUsd, 1200);
  assert.deepEqual(r.scenarios[1], {
    id: 'expected', hoursReleasedMonthly: 25, capacityValueMonthlyUsd: 1000,
    laborCashMonthlyUsd: 500, totalCashBenefitMonthlyUsd: 850,
    netMonthlyCashUsd: 250, horizonNetCashUsd: 1800, paybackMonths: 4.8,
    roiPct: 21.43, breakEvenEfficiencyPct: 17.5,
  });
  assert.deepEqual(r.missingInputs, []);
  assert.deepEqual(r.sensitivity, [
    { id: 'efficiency-down', monthlyImpactUsd: -200 },
    { id: 'cost-up', monthlyImpactUsd: -120 },
    { id: 'benefit-down', monthlyImpactUsd: -30 },
  ]);
  doc.inputs.baselineMonthlyCostUsd = 100_000;
  assert.equal(scenario(doc).netMonthlyCashUsd, 250, 'unretired baseline spend is not a benefit');
});

test('released staff capacity is not cash until explicitly realized; no double counting', () => {
  const doc = fixture();
  for (const s of doc.inputs.scenarios) s.cashRealizationPct = 0;
  assert.equal(scenario(doc).capacityValueMonthlyUsd, 1000);
  assert.equal(scenario(doc).laborCashMonthlyUsd, 0);
  assert.equal(scenario(doc).netMonthlyCashUsd, -250);
  assert.equal(scenario(doc).paybackMonths, null);
  assert.equal(scenario(doc).breakEvenEfficiencyPct, null);
  assert.equal(calculateBusinessCase(doc).sensitivity[0].monthlyImpactUsd, 0);
});

test('unknown monetary values remain unknown and identify the fields to discuss', () => {
  const doc = fixture();
  doc.inputs = defaultInputs();
  doc.source.monthlyUsd = null;
  doc.source.oneTimeUsd = null;
  doc.inputs.scenarios[1].additionalBenefitMonthlyUsd = null;
  const r = calculateBusinessCase(doc);
  assert.equal(r.solutionMonthlyUsd, null);
  assert.equal(r.investmentUsd, null);
  assert.equal(r.baselineMonthlyUsd, null);
  assert.equal(r.scenarios[1].capacityValueMonthlyUsd, null);
  assert.equal(r.scenarios[1].totalCashBenefitMonthlyUsd, null);
  assert.equal(r.scenarios[1].netMonthlyCashUsd, null);
  assert.equal(r.scenarios[1].roiPct, null);
  assert.equal(r.scenarios[1].paybackMonths, null);
  assert.ok(r.missingInputs.includes('solutionMonthlyUsd'));
  assert.ok(r.missingInputs.includes('solutionOneTimeUsd'));
  assert.ok(r.missingInputs.includes('additionalImplementationUsd'));
  assert.ok(r.missingInputs.includes('scenarios.expected.additionalBenefitMonthlyUsd'));
});

test('explicit zero cash realization allows cash comparison without inventing unknown capacity', () => {
  const doc = fixture();
  doc.inputs.manualHoursMonthly = null;
  doc.inputs.loadedHourlyCostUsd = null;
  for (const s of doc.inputs.scenarios) s.cashRealizationPct = 0;
  const r = scenario(doc);
  assert.equal(r.hoursReleasedMonthly, null);
  assert.equal(r.capacityValueMonthlyUsd, null);
  assert.equal(r.laborCashMonthlyUsd, 0);
  assert.equal(r.netMonthlyCashUsd, -250);
  doc.inputs.manualHoursMonthly = 0;
  assert.equal(scenario(doc).capacityValueMonthlyUsd, 0);
});

test('stale or missing source costs are withheld; explicit reasoned overrides work including zero', () => {
  for (const status of ['stale', 'missing'] as const) {
    const doc = fixture();
    doc.source.estimateStatus = status;
    assert.deepEqual(validateDocument(doc), { ok: false, error: 'source.stale-cost' });
    doc.source.monthlyUsd = null;
    doc.source.oneTimeUsd = null;
    assert.equal(calculateBusinessCase(doc).solutionMonthlyUsd, null);
    assert.equal(calculateBusinessCase(doc).investmentUsd, null);
    assert.ok(calculateBusinessCase(doc).warnings.includes(`source-${status}`));
    doc.inputs.monthlyCostOverrideUsd = 0;
    doc.inputs.oneTimeCostOverrideUsd = 100;
    assert.deepEqual(validateDocument(doc), { ok: false, error: 'inputs.costOverrideReason' });
    doc.inputs.costOverrideReason = 'Customer supplied an independent quote.';
    assert.equal(calculateBusinessCase(doc).solutionMonthlyUsd, 100);
    assert.equal(calculateBusinessCase(doc).investmentUsd, 300);
    assert.ok(calculateBusinessCase(doc).warnings.includes('cost-overrides'));
  }
});

test('no infinite ROI or invented payback for free spend, negative returns or incomplete investment', () => {
  const doc = fixture();
  assert.equal(scenario(doc, 'conservative').netMonthlyCashUsd, -50);
  assert.equal(scenario(doc, 'conservative').horizonNetCashUsd, -1800);
  assert.equal(scenario(doc, 'conservative').paybackMonths, null);
  doc.source.monthlyUsd = 0;
  doc.source.oneTimeUsd = 0;
  doc.inputs.additionalRecurringMonthlyUsd = 0;
  doc.inputs.additionalImplementationUsd = 0;
  assert.equal(scenario(doc).paybackMonths, 0);
  assert.equal(scenario(doc).roiPct, null);
  assert.equal(scenario(doc).breakEvenEfficiencyPct, 0);
  doc.inputs.additionalImplementationUsd = null;
  assert.equal(scenario(doc).paybackMonths, null);
  assert.equal(scenario(doc).horizonNetCashUsd, null);
});

test('zero net cash has no payback; impossible thresholds remain visible above the feasible efficiency range', () => {
  const doc = fixture();
  doc.source.monthlyUsd = 750;
  assert.equal(scenario(doc).netMonthlyCashUsd, 0);
  assert.equal(scenario(doc).paybackMonths, null);
  doc.source.monthlyUsd = 4000;
  assert.ok(scenario(doc).breakEvenEfficiencyPct! > 100);
  assert.ok(calculateBusinessCase(doc).warnings.includes('break-even-unreachable'));
});

test('sensitivity clamps efficiency at zero, uses total solution cost and changes only monthly cash', () => {
  const doc = fixture();
  doc.inputs.scenarios[1].efficiencyPct = 5;
  assert.deepEqual(calculateBusinessCase(doc).sensitivity, [
    { id: 'efficiency-down', monthlyImpactUsd: -100 },
    { id: 'cost-up', monthlyImpactUsd: -120 },
    { id: 'benefit-down', monthlyImpactUsd: -30 },
  ]);
  doc.inputs.scenarios[1].additionalBenefitMonthlyUsd = null;
  doc.inputs.additionalRecurringMonthlyUsd = null;
  assert.equal(calculateBusinessCase(doc).sensitivity[1].monthlyImpactUsd, null);
  assert.equal(calculateBusinessCase(doc).sensitivity[2].monthlyImpactUsd, null);
});

test('validation rejects invalid numbers, out-of-range amounts, retired spend beyond baseline and missing fields', () => {
  for (const invalid of [-1, Infinity, NaN, 1_000_000_001, '100', undefined]) {
    const doc = fixture();
    (doc.inputs as unknown as Record<string, unknown>).additionalRecurringMonthlyUsd = invalid;
    assert.deepEqual(validateDocument(doc), { ok: false, error: 'inputs.additionalRecurringMonthlyUsd' });
  }
  const doc = fixture();
  doc.inputs.retiredMonthlyCostUsd = 1001;
  assert.deepEqual(validateDocument(doc), { ok: false, error: 'inputs.retiredMonthlyCostUsd' });
  for (const horizon of [0, 61, 1.5]) {
    const d = fixture(); d.inputs.horizonMonths = horizon;
    assert.deepEqual(validateDocument(d), { ok: false, error: 'inputs.horizonMonths' });
  }
  const d = fixture(); d.inputs.loadedHourlyCostUsd = 100_001;
  assert.deepEqual(validateDocument(d), { ok: false, error: 'inputs.loadedHourlyCostUsd' });
  d.inputs.loadedHourlyCostUsd = 100; d.inputs.manualHoursMonthly = 1_000_001;
  assert.deepEqual(validateDocument(d), { ok: false, error: 'inputs.manualHoursMonthly' });
});

test('validation requires one of each bounded scenario and canonicalizes the order', () => {
  const doc = fixture();
  doc.inputs.scenarios.reverse();
  const checked = validateDocument(doc);
  assert.ok(checked.ok);
  assert.deepEqual(checked.value.inputs.scenarios.map(s => s.id), ['conservative', 'expected', 'optimistic']);
  doc.inputs.scenarios[0].id = 'expected';
  assert.deepEqual(validateDocument(doc), { ok: false, error: 'inputs.scenarios' });
  const d = fixture(); d.inputs.scenarios[1].efficiencyPct = 101;
  assert.equal(validateDocument(d).ok, false);
  d.inputs.scenarios[1].efficiencyPct = 25; d.inputs.scenarios[1].cashRealizationPct = -1;
  assert.equal(validateDocument(d).ok, false);
});

test('validation bounds source data and copies recognized fields, calculation never mutates the snapshot', () => {
  const original = fixture();
  original.source.title = '  Customer case  ';
  const payload = { ...original, ignored: 'not saved', source: { ...original.source, ignored: 'not saved' } };
  const checked = validateDocument(payload);
  assert.ok(checked.ok);
  assert.equal(checked.value.source.title, 'Customer case');
  assert.equal('ignored' in checked.value, false);
  assert.equal('ignored' in checked.value.source, false);
  const before = structuredClone(original);
  calculateBusinessCase(original);
  assert.deepEqual(original, before);
  checked.value.inputs.scenarios[0].efficiencyPct = 99;
  checked.value.source.caveats.push('Independent copy');
  assert.deepEqual(original, before);
  const tooLong = fixture(); tooLong.source.context = 'x'.repeat(12_001);
  assert.deepEqual(validateDocument(tooLong), { ok: false, error: 'source.context' });
  tooLong.source.context = ''; tooLong.source.caveats = Array(21).fill('caveat');
  assert.deepEqual(validateDocument(tooLong), { ok: false, error: 'source.caveats' });
  for (const id of ['../other', 'id?owner=x', 'id/other', 'x'.repeat(129)]) {
    const unsafe = fixture(); unsafe.source.sessionId = id;
    assert.deepEqual(validateDocument(unsafe), { ok: false, error: 'source.sessionId' });
  }
});

test('defaults are independent provisional worksheets and never prefill customer financial evidence', () => {
  const first = defaultInputs();
  const second = defaultInputs();
  first.scenarios[0].efficiencyPct = 99;
  assert.equal(second.scenarios[0].efficiencyPct, 10);
  assert.equal(second.baselineMonthlyCostUsd, null);
  assert.equal(second.manualHoursMonthly, null);
  assert.equal(second.additionalRecurringMonthlyUsd, null);
  assert.equal(second.evidence, '');
  assert.equal(second.scenarios[0].cashRealizationPct, 0);
});

test('snapshot timestamps cannot pass validation and then crash date formatting', () => {
  for (const value of [0, -1, 1.5, Infinity, 8_640_000_000_000_001, Number.MAX_SAFE_INTEGER]) {
    const doc = fixture(); doc.source.capturedAt = value;
    assert.deepEqual(validateDocument(doc), { ok: false, error: 'source.capturedAt' });
  }
  const doc = fixture(); doc.source.capturedAt = 8_640_000_000_000_000;
  assert.equal(validateDocument(doc).ok, true);
  assert.doesNotThrow(() => new Intl.DateTimeFormat('ko', { dateStyle: 'medium', timeStyle: 'short' }).format(doc.source.capturedAt));
});

test('bounds keep extreme valid calculations finite and invalid typed calls fail closed', () => {
  const doc = fixture();
  doc.inputs.manualHoursMonthly = 1_000_000;
  doc.inputs.loadedHourlyCostUsd = 100_000;
  doc.inputs.horizonMonths = 60;
  for (const s of doc.inputs.scenarios) { s.efficiencyPct = 100; s.cashRealizationPct = 100; }
  const r = scenario(doc);
  for (const value of Object.values(r)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
  doc.inputs.horizonMonths = Infinity;
  assert.throws(() => calculateBusinessCase(doc), /Invalid business case: inputs.horizonMonths/);
});

test('AI prose accepts bounded discussion prompts while rejecting numerical, currency and HTML payloads', () => {
  const prose = { summary: '  Validate the assumptions together with the customer. ',
    questions: ['Which costs can actually be retired?'], validationSteps: ['Measure task time before and during the pilot.'] };
  assert.equal(validateExplanation(prose)?.summary, 'Validate the assumptions together with the customer.');
  for (const unsafe of ['Savings are 12%', 'Save $many', 'USD savings', '<img src=x>', '收益为１０％', 'Ⅳ months', 'A'.repeat(901)]) {
    assert.equal(validateExplanation({ ...prose, summary: unsafe }), null, unsafe);
  }
  assert.equal(validateExplanation({ ...prose, questions: [] }), null);
  assert.equal(validateExplanation({ ...prose, validationSteps: Array(6).fill('Measure costs.') }), null);
  assert.equal(validateExplanation({ ...prose, questions: ['Expected cost is 10.'] }), null);
  assert.equal(validateExplanation({ ...prose, summary: null }), null);
});
