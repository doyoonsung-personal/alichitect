import type { BusinessCaseLang } from '../../../../../packages/business-case/src/types.ts';
import translations from './translations.json' with { type: 'json' };

export const en = {
  title: 'Business case', subtitle: 'A working sheet for the customer conversation', close: 'Close',
  intro: 'Connect the proposed solution to measurable business outcomes. Agree the assumptions together, then validate them in a PoC.',
  source: 'Solution snapshot', refresh: 'Refresh from current session', changed: 'The design or estimate has changed. Refresh the snapshot before relying on these results.',
  current: 'Estimate matched the captured design', stale: 'Estimate needs updating', missing: 'No estimate available', captured: 'Captured',
  sourceMonthly: 'Imported monthly estimate', sourceOnce: 'Imported one-time estimate', caveats: 'Estimate coverage and assumptions',
  context: 'Selected customer and solution context', unknown: 'Unknown', notAvailable: 'Not established', blank: 'Leave unknown values blank. Enter 0 only when you have confirmed there is no cost.',
  baseline: '1. Understand the current operation', baselineMonthlyCostUsd: 'Current non-labor operating cost / month (USD)',
  retiredMonthlyCostUsd: 'Non-labor cost actually retired / month (USD)', manualHoursMonthly: 'Manual work hours / month',
  loadedHourlyCostUsd: 'Loaded labor cost / hour (USD)', baselineHint: 'Retired spend must be part of the current non-labor baseline. Keep payroll separate to avoid counting it twice.',
  investment: '2. Complete the proposed investment', additionalRecurringMonthlyUsd: 'Additional recurring cost / month (USD)',
  additionalImplementationUsd: 'Additional implementation, training and transition cost (USD)', overrides: 'Use a customer-specific cost assumption',
  monthlyCostOverrideUsd: 'Replace imported monthly cost (USD)', oneTimeCostOverrideUsd: 'Replace imported one-time cost (USD)',
  costOverrideReason: 'Why is this cost being replaced? Include the source.', overrideHint: 'Overrides replace the imported totals; additional costs above are still added. Include any unpriced scope.',
  horizonMonths: 'Evaluation period (months)', evidence: 'Evidence, boundaries and assumptions', evidenceHint: 'Record who supplied the inputs, when they were measured, what is excluded, and how cash savings could actually be realized.',
  scenarios: '3. Discuss three possible outcomes', illustrative: 'The initial efficiency percentages are illustrations, not a forecast. Confirm or replace them with the customer.',
  conservative: 'Conservative', expected: 'Expected', optimistic: 'Optimistic', efficiencyPct: 'Manual hours reduced (%)', cashRealizationPct: 'Released labor value converted to cash (%)',
  additionalBenefitMonthlyUsd: 'Other incremental cash benefit / month (USD)', cashHint: 'Released time is capacity, not automatic payroll savings. Only count avoidable overtime, hiring or payroll where there is an agreed plan. Other benefits must exclude savings counted elsewhere.',
  results: '4. Compare the business case', baselineTotal: 'Current monthly baseline', solutionTotal: 'Proposed recurring monthly spend', investmentTotal: 'One-time investment',
  hoursReleasedMonthly: 'Hours released / month', capacityValueMonthlyUsd: 'Value of released capacity / month', laborCashMonthlyUsd: 'Realizable labor cash benefit / month',
  totalCashBenefitMonthlyUsd: 'Total cash benefit / month', netMonthlyCashUsd: 'Net cash benefit / month', horizonNetCashUsd: 'Net cash over evaluation period',
  paybackMonths: 'Payback (months)', roiPct: 'Return over evaluation period (%)', breakEvenEfficiencyPct: 'Hours reduction needed to break even (%)',
  formula: 'Net cash = retired operating spend + realizable labor savings + other cash benefit − proposed recurring spend. The evaluation-period result also deducts the one-time investment. Capacity value is shown separately.',
  formulaDetails: 'Calculation definitions', roiFormula: 'Return = net cash over the evaluation period ÷ (one-time investment + recurring spend over that period). Payback uses positive recurring net cash. Break-even targets recover the investment within the selected period. No discount rate, tax, ramp-up or residual value is modeled.',
  missingInputs: 'Confirm these inputs', warnings: 'Interpretation notes', sensitivity: 'What would change the expected case?',
  'efficiency-down': 'Manual-hours reduction is 10 percentage points lower', 'cost-up': 'Proposed recurring spend is 20% higher', 'benefit-down': 'Other cash benefits are 20% lower',
  sensitivityHint: 'Each row changes one assumption; the amount is its effect on monthly net cash in the expected case.',
  poc: 'PoC validation', pocHint: 'Measure the current task time, test the proposed reduction on representative work, and confirm which costs could actually disappear. Treat a break-even target above 100% as unattainable through labor savings alone.',
  explain: 'Prepare discussion questions', explaining: 'Preparing questions…', aiLabel: 'AI discussion aid · review with the customer', questions: 'Questions to resolve', validation: 'Suggested validation steps',
  save: 'Save a version', saving: 'Saving…', saved: 'Version saved', history: 'Saved versions', noHistory: 'No saved versions yet.', load: 'Open version', delete: 'Delete',
  confirmDelete: 'Delete this saved version?', yesDelete: 'Delete version', cancel: 'Cancel', versionLoaded: 'Saved version opened', unsaved: 'Unsaved worksheet', savedVersion: 'Saved worksheet',
  manageAllVersions: 'Manage all saved versions', manageAllHint: 'View titles and dates across your account, including conversations no longer saved in this browser. Delete old versions to free storage; their worksheets are not imported here.',
  loadAllVersions: 'Load all saved versions', refreshVersions: 'Refresh list', loadingVersions: 'Loading saved versions…', versionDeleted: 'Saved version deleted',
  print: 'Print / Save PDF', printHint: 'Use your browser’s Print dialog and choose Save as PDF.',
  loading: 'Opening business case…', loadingFailed: 'Could not open the business case. Try again.', retry: 'Try again',
  error: 'This action could not be completed. Your current worksheet is still available.', invalid: 'Check the input values. Amounts cannot be negative, percentages must be between 0 and 100, and retired costs cannot exceed the baseline.',
  overrideRequired: 'Explain the source and reason for each cost override before saving or preparing questions.',
  limited: 'The discussion-question limit has been reached. You can still edit, calculate and save the worksheet.',
  historyFull: 'Saved-version storage is full (20 per session or 200 per account). Delete an older version, then save again.',
  tooLarge: 'This worksheet is too large to send. Shorten the context or evidence notes, then try again.',
  signedOut: 'Sign in again to load or save business cases.', unavailable: 'Business cases are not available on this server.',
  sourceRefreshDone: 'Source refreshed. Customer assumptions and cost overrides have been retained; review their relevance.',
  versionNotice: 'Versions are stored separately from the design. Opening a version replaces this worksheet; save any changes you want to keep first.',
  printTitle: 'Business case · working assumptions', workingDocument: 'Discussion document. These scenarios are assumptions to validate, not a savings commitment.',
  'solutionMonthlyUsd': 'Monthly solution cost or a sourced override', 'solutionOneTimeUsd': 'One-time solution cost or a sourced override',
  'scenario-hypotheses': 'Scenario improvements are hypotheses for customer validation.',
  'capacity-is-not-cash': 'Released staff capacity is not automatically a cash saving.',
  'evidence-missing': 'Add the source and basis of the operational assumptions.',
  'source-stale': 'The imported estimate was already stale when captured; its amounts are withheld.',
  'source-missing': 'No solution estimate was available when this snapshot was captured.',
  'cost-overrides': 'This worksheet uses explicitly entered cost overrides.',
  'break-even-unreachable': 'At least one scenario cannot break even through labor reduction alone within the evaluation period.',
} as const;

export type CopyKey = keyof typeof en;
export type BCText = (key: string) => string;
export function makeText(lang: BusinessCaseLang): BCText {
  const localized = lang === 'en' ? {} : translations[lang] as Record<string, string>;
  return key => localized[key] ?? en[key as CopyKey] ?? key;
}

export function fieldText(key: string, t: BCText): string {
  const m = /^scenarios\.(conservative|expected|optimistic)\.additionalBenefitMonthlyUsd$/.exec(key);
  return m ? `${t(m[1])}: ${t('additionalBenefitMonthlyUsd')}` : t(key);
}

export function formatNumber(value: number | null, lang: BusinessCaseLang, unknown: string, money = false): string {
  return value === null ? unknown : new Intl.NumberFormat(lang, money
    ? { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }
    : { maximumFractionDigits: 1 }).format(value);
}
