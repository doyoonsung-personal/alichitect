/** Standalone business-case contract. Money is USD; null always means unknown. */
export type BusinessCaseLang = 'en' | 'ko' | 'zh';
export type ScenarioId = 'conservative' | 'expected' | 'optimistic';

export interface BusinessCaseSource {
  sessionId: string;
  title: string;
  capturedAt: number;
  /** Opaque hashes from the host adapter, never interpreted by the calculation engine. */
  designFingerprint: string;
  estimateFingerprint: string;
  estimateStatus: 'current' | 'stale' | 'missing';
  monthlyUsd: number | null;
  oneTimeUsd: number | null;
  /** Selected design context, not the full conversation or personal account data. */
  context: string;
  caveats: string[];
}

export interface BusinessCaseScenario {
  id: ScenarioId;
  /** Hypothesis to validate; reduction in the stated manual-work hours. */
  efficiencyPct: number;
  /** Actual avoidable payroll/overtime fraction; capacity alone is not cash. */
  cashRealizationPct: number;
  /** Customer-supplied incremental contribution/cost avoidance; exclude duplicated savings. */
  additionalBenefitMonthlyUsd: number | null;
}

export interface BusinessCaseInputs {
  baselineMonthlyCostUsd: number | null;
  /** Portion of baseline non-labor spend actually retired, not all existing spend. */
  retiredMonthlyCostUsd: number | null;
  manualHoursMonthly: number | null;
  loadedHourlyCostUsd: number | null;
  additionalRecurringMonthlyUsd: number | null;
  additionalImplementationUsd: number | null;
  monthlyCostOverrideUsd: number | null;
  oneTimeCostOverrideUsd: number | null;
  costOverrideReason: string;
  horizonMonths: number;
  evidence: string;
  scenarios: BusinessCaseScenario[];
}

export interface BusinessCaseDocument {
  schemaVersion: 1;
  source: BusinessCaseSource;
  inputs: BusinessCaseInputs;
}

export interface ScenarioResult {
  id: ScenarioId;
  hoursReleasedMonthly: number | null;
  capacityValueMonthlyUsd: number | null;
  laborCashMonthlyUsd: number | null;
  totalCashBenefitMonthlyUsd: number | null;
  netMonthlyCashUsd: number | null;
  horizonNetCashUsd: number | null;
  /** Null when investment or positive recurring cash return cannot be established. */
  paybackMonths: number | null;
  roiPct: number | null;
  breakEvenEfficiencyPct: number | null;
}

export interface BusinessCaseCalculation {
  solutionMonthlyUsd: number | null;
  investmentUsd: number | null;
  baselineMonthlyUsd: number | null;
  scenarios: ScenarioResult[];
  /** Stable field identifiers; localize them in the UI. */
  missingInputs: string[];
  warnings: string[];
  sensitivity: Array<{ id: 'efficiency-down' | 'cost-up' | 'benefit-down'; monthlyImpactUsd: number | null }>;
}

export interface BusinessCaseExplanation {
  summary: string;
  questions: string[];
  validationSteps: string[];
}

/** Records are immutable versions. Creating another version never changes a previous one. */
export interface BusinessCaseRecord {
  id: string;
  createdAt: number;
  document: BusinessCaseDocument;
}

// Public domain exports implemented by engine.ts:
// defaultInputs(): BusinessCaseInputs
// validateDocument(value: unknown): { ok: true; value: BusinessCaseDocument } | { ok: false; error: string }
// calculateBusinessCase(document: BusinessCaseDocument): BusinessCaseCalculation
// validateExplanation(value: unknown): BusinessCaseExplanation | null
