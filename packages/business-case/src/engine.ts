import type {
  BusinessCaseCalculation, BusinessCaseDocument, BusinessCaseExplanation, BusinessCaseInputs,
  BusinessCaseScenario, BusinessCaseSource, ScenarioId, ScenarioResult,
} from './types.ts';

export const SCENARIO_IDS: readonly ScenarioId[] = ['conservative', 'expected', 'optimistic'];
const MONEY_LIMIT = 1_000_000_000;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const nullable = (v: unknown, max: number): v is number | null => v === null || finite(v, max);
const text = (v: unknown, max: number, required = false): v is string =>
  typeof v === 'string' && v.length <= max && (!required || v.trim().length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);

/** Initial rates are illustrative hypotheses, not predicted customer savings. */
export function defaultInputs(): BusinessCaseInputs {
  return {
    baselineMonthlyCostUsd: null, retiredMonthlyCostUsd: null,
    manualHoursMonthly: null, loadedHourlyCostUsd: null,
    additionalRecurringMonthlyUsd: null, additionalImplementationUsd: null,
    monthlyCostOverrideUsd: null, oneTimeCostOverrideUsd: null, costOverrideReason: '',
    horizonMonths: 12, evidence: '',
    scenarios: SCENARIO_IDS.map((id, i) => ({
      id, efficiencyPct: [10, 25, 40][i], cashRealizationPct: 0, additionalBenefitMonthlyUsd: 0,
    })),
  };
}

type Validation = { ok: true; value: BusinessCaseDocument } | { ok: false; error: string };
const bad = (error: string): Validation => ({ ok: false, error });

/** Validate and copy the complete boundary object; unrecognized fields are never persisted. */
export function validateDocument(value: unknown): Validation {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.source) || !object(value.inputs)) return bad('document');
  const s = value.source;
  if (!text(s.sessionId, 128, true) || !/^[A-Za-z0-9_-]+$/.test(s.sessionId.trim())) return bad('source.sessionId');
  if (!text(s.title, 240)) return bad('source.title');
  // Integers beyond Date's TimeClip limit are finite but crash Intl date rendering.
  if (!finite(s.capturedAt, 8_640_000_000_000_000) || !Number.isInteger(s.capturedAt) || s.capturedAt === 0) return bad('source.capturedAt');
  if (!text(s.designFingerprint, 256, true)) return bad('source.designFingerprint');
  if (!text(s.estimateFingerprint, 256, true)) return bad('source.estimateFingerprint');
  if (s.estimateStatus !== 'current' && s.estimateStatus !== 'stale' && s.estimateStatus !== 'missing') return bad('source.estimateStatus');
  if (!nullable(s.monthlyUsd, MONEY_LIMIT) || !nullable(s.oneTimeUsd, MONEY_LIMIT)) return bad('source.cost');
  if (s.estimateStatus !== 'current' && (s.monthlyUsd !== null || s.oneTimeUsd !== null)) return bad('source.stale-cost');
  if (!text(s.context, 12_000)) return bad('source.context');
  if (!Array.isArray(s.caveats) || s.caveats.length > 20 || !s.caveats.every(v => text(v, 500, true))) return bad('source.caveats');
  const source: BusinessCaseSource = {
    sessionId: s.sessionId.trim(), title: s.title.trim(), capturedAt: s.capturedAt,
    designFingerprint: s.designFingerprint.trim(), estimateFingerprint: s.estimateFingerprint.trim(),
    estimateStatus: s.estimateStatus, monthlyUsd: s.monthlyUsd, oneTimeUsd: s.oneTimeUsd,
    context: s.context.trim(), caveats: s.caveats.map(v => (v as string).trim()),
  };
  const v = value.inputs;
  const monetary = ['baselineMonthlyCostUsd', 'retiredMonthlyCostUsd', 'additionalRecurringMonthlyUsd',
    'additionalImplementationUsd', 'monthlyCostOverrideUsd', 'oneTimeCostOverrideUsd'] as const;
  for (const key of monetary) if (!nullable(v[key], MONEY_LIMIT)) return bad(`inputs.${key}`);
  if (!nullable(v.manualHoursMonthly, 1_000_000)) return bad('inputs.manualHoursMonthly');
  if (!nullable(v.loadedHourlyCostUsd, 100_000)) return bad('inputs.loadedHourlyCostUsd');
  if (!finite(v.horizonMonths, 60) || !Number.isInteger(v.horizonMonths) || v.horizonMonths < 1) return bad('inputs.horizonMonths');
  if (!text(v.evidence, 6000)) return bad('inputs.evidence');
  if (!text(v.costOverrideReason, 1000)) return bad('inputs.costOverrideReason');
  if ((v.monthlyCostOverrideUsd !== null || v.oneTimeCostOverrideUsd !== null) && !v.costOverrideReason.trim()) return bad('inputs.costOverrideReason');
  if (typeof v.retiredMonthlyCostUsd === 'number' && typeof v.baselineMonthlyCostUsd === 'number' && v.retiredMonthlyCostUsd > v.baselineMonthlyCostUsd) return bad('inputs.retiredMonthlyCostUsd');
  if (!Array.isArray(v.scenarios) || v.scenarios.length !== 3) return bad('inputs.scenarios');
  const scenarios: BusinessCaseScenario[] = [];
  for (const id of SCENARIO_IDS) {
    const rows = v.scenarios.filter(r => object(r) && r.id === id);
    if (rows.length !== 1) return bad('inputs.scenarios');
    const row = rows[0] as Record<string, unknown>;
    if (!finite(row.efficiencyPct, 100)) return bad(`inputs.scenarios.${id}.efficiencyPct`);
    if (!finite(row.cashRealizationPct, 100)) return bad(`inputs.scenarios.${id}.cashRealizationPct`);
    if (!nullable(row.additionalBenefitMonthlyUsd, MONEY_LIMIT)) return bad(`inputs.scenarios.${id}.additionalBenefitMonthlyUsd`);
    scenarios.push({ id, efficiencyPct: row.efficiencyPct, cashRealizationPct: row.cashRealizationPct, additionalBenefitMonthlyUsd: row.additionalBenefitMonthlyUsd });
  }
  const inputs: BusinessCaseInputs = {
    baselineMonthlyCostUsd: v.baselineMonthlyCostUsd as number | null,
    retiredMonthlyCostUsd: v.retiredMonthlyCostUsd as number | null,
    manualHoursMonthly: v.manualHoursMonthly, loadedHourlyCostUsd: v.loadedHourlyCostUsd,
    additionalRecurringMonthlyUsd: v.additionalRecurringMonthlyUsd as number | null,
    additionalImplementationUsd: v.additionalImplementationUsd as number | null,
    monthlyCostOverrideUsd: v.monthlyCostOverrideUsd as number | null,
    oneTimeCostOverrideUsd: v.oneTimeCostOverrideUsd as number | null,
    costOverrideReason: v.costOverrideReason.trim(), horizonMonths: v.horizonMonths, evidence: v.evidence.trim(), scenarios,
  };
  return { ok: true, value: { schemaVersion: 1, source, inputs } };
}

type Amount = number | null;
const add = (...values: Amount[]): Amount => values.some(v => v === null) ? null : values.reduce<number>((a, v) => a + v!, 0);
// Explicit zero annihilates an unknown factor. This is knowledge, not a default:
// choosing no cash realization makes payroll cash savings zero even when hours are unknown.
const multiply = (...values: Amount[]): Amount => values.some(v => v === 0) ? 0 : values.some(v => v === null) ? null : values.reduce<number>((a, v) => a * v!, 1);
const subtract = (a: Amount, b: Amount): Amount => a === null || b === null ? null : a - b;
const round = (v: Amount): Amount => v === null ? null : Math.round((v + Number.EPSILON) * 100) / 100 || 0;

function scenarioResult(i: BusinessCaseInputs, scenario: BusinessCaseScenario, monthly: Amount, investment: Amount): ScenarioResult {
  const hours = multiply(i.manualHoursMonthly, scenario.efficiencyPct / 100);
  const capacity = multiply(hours, i.loadedHourlyCostUsd);
  const laborCash = multiply(capacity, scenario.cashRealizationPct / 100);
  const benefits = add(i.retiredMonthlyCostUsd, laborCash, scenario.additionalBenefitMonthlyUsd);
  const net = subtract(benefits, monthly);
  const horizonNet = subtract(multiply(net, i.horizonMonths), investment);
  const totalSpend = add(investment, multiply(monthly, i.horizonMonths));
  const payback = investment !== null && net !== null && net > 0 ? investment / net : null;
  const roi = horizonNet !== null && totalSpend !== null && totalSpend > 0 ? horizonNet / totalSpend * 100 : null;
  const cashAtFullEfficiency = multiply(i.manualHoursMonthly, i.loadedHourlyCostUsd, scenario.cashRealizationPct / 100);
  const nonLaborBenefits = add(i.retiredMonthlyCostUsd, scenario.additionalBenefitMonthlyUsd);
  const requiredCash = subtract(add(monthly, investment === null ? null : investment / i.horizonMonths), nonLaborBenefits);
  // This threshold recovers upfront cost by the chosen horizon. It is not a promise
  // or an adoption assumption. A value above 100 means hours alone cannot reach it.
  const threshold = requiredCash === null ? null : requiredCash <= 0 ? 0
    : cashAtFullEfficiency !== null && cashAtFullEfficiency > 0 ? requiredCash / cashAtFullEfficiency * 100 : null;
  return {
    id: scenario.id, hoursReleasedMonthly: round(hours), capacityValueMonthlyUsd: round(capacity),
    laborCashMonthlyUsd: round(laborCash), totalCashBenefitMonthlyUsd: round(benefits), netMonthlyCashUsd: round(net),
    horizonNetCashUsd: round(horizonNet), paybackMonths: round(payback), roiPct: round(roi), breakEvenEfficiencyPct: round(threshold),
  };
}

/**
 * Incremental, undiscounted planning comparison in USD, with benefits/costs starting
 * immediately and recurring evenly. No tax, financing, ramp-up or inflation model.
 *
 * monthly solution spend = current source (or explicit override) + extra recurring
 * upfront investment = source one-time (or explicit override) + extra implementation
 * baseline = existing NON-LABOR spend + manual hours × loaded hourly cost
 * cash benefit = retired NON-LABOR spend + released capacity × actual cash realization
 *                + explicitly entered, non-duplicated additional benefit
 * net cash/month = cash benefit − solution spend
 * horizon net = net cash/month × horizon − upfront investment
 * ROI = horizon net / (upfront investment + solution spend × horizon)
 *
 * Existing baseline spend is not itself a benefit. Released capacity is shown
 * separately and becomes cash only through the customer's cash-realization input.
 */
export function calculateBusinessCase(document: BusinessCaseDocument): BusinessCaseCalculation {
  const checked = validateDocument(document);
  if (!checked.ok) throw new Error(`Invalid business case: ${checked.error}`);
  const { source: s, inputs: i } = checked.value;
  const monthlyBase = i.monthlyCostOverrideUsd ?? (s.estimateStatus === 'current' ? s.monthlyUsd : null);
  const upfrontBase = i.oneTimeCostOverrideUsd ?? (s.estimateStatus === 'current' ? s.oneTimeUsd : null);
  const monthly = add(monthlyBase, i.additionalRecurringMonthlyUsd);
  const investment = add(upfrontBase, i.additionalImplementationUsd);
  const scenarios = i.scenarios.map(scenario => scenarioResult(i, scenario, monthly, investment));
  const missingInputs: string[] = [];
  if (monthlyBase === null) missingInputs.push('solutionMonthlyUsd');
  if (upfrontBase === null) missingInputs.push('solutionOneTimeUsd');
  for (const key of ['baselineMonthlyCostUsd', 'retiredMonthlyCostUsd', 'manualHoursMonthly', 'loadedHourlyCostUsd',
    'additionalRecurringMonthlyUsd', 'additionalImplementationUsd'] as const) if (i[key] === null) missingInputs.push(key);
  for (const scenario of i.scenarios) if (scenario.additionalBenefitMonthlyUsd === null) missingInputs.push(`scenarios.${scenario.id}.additionalBenefitMonthlyUsd`);
  const warnings = ['scenario-hypotheses', 'capacity-is-not-cash'];
  if (!i.evidence) warnings.push('evidence-missing');
  if (s.estimateStatus !== 'current') warnings.push(`source-${s.estimateStatus}`);
  if (i.monthlyCostOverrideUsd !== null || i.oneTimeCostOverrideUsd !== null) warnings.push('cost-overrides');
  if (scenarios.some(r => r.breakEvenEfficiencyPct !== null && r.breakEvenEfficiencyPct > 100)) warnings.push('break-even-unreachable');
  const expected = i.scenarios.find(scenario => scenario.id === 'expected')!;
  // Sensitivity values are changes to monthly net cash, not a second ROI forecast.
  const laborBase = multiply(i.manualHoursMonthly, i.loadedHourlyCostUsd, expected.cashRealizationPct / 100);
  return {
    solutionMonthlyUsd: round(monthly), investmentUsd: round(investment),
    baselineMonthlyUsd: round(add(i.baselineMonthlyCostUsd, multiply(i.manualHoursMonthly, i.loadedHourlyCostUsd))),
    scenarios, missingInputs, warnings,
    sensitivity: [
      { id: 'efficiency-down', monthlyImpactUsd: round(multiply(laborBase, -Math.min(10, expected.efficiencyPct) / 100)) },
      { id: 'cost-up', monthlyImpactUsd: round(multiply(monthly, -0.2)) },
      { id: 'benefit-down', monthlyImpactUsd: round(multiply(expected.additionalBenefitMonthlyUsd, -0.2)) },
    ],
  };
}

/** AI may suggest discussion points; numerical results belong only to the engine. */
export function validateExplanation(value: unknown): BusinessCaseExplanation | null {
  if (!object(value)) return null;
  const plain = (v: unknown, max: number): v is string => text(v, max, true)
    && !/[\p{N}\p{Sc}%<>]|```|\b(?:USD|KRW|CNY|RMB|EUR|dollars?|euros?|yuan)\b/iu.test(v);
  if (!plain(value.summary, 900)) return null;
  const list = (v: unknown): v is string[] => Array.isArray(v) && v.length >= 1 && v.length <= 5 && v.every(x => plain(x, 500));
  if (!list(value.questions) || !list(value.validationSteps)) return null;
  return { summary: value.summary.trim(), questions: value.questions.map(s => s.trim()), validationSteps: value.validationSteps.map(s => s.trim()) };
}
