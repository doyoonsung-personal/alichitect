import type { BusinessCaseCalculation, BusinessCaseDocument, BusinessCaseExplanation, BusinessCaseLang, ScenarioResult } from '../../../../../packages/business-case/src/types.ts';
import { fieldText, formatNumber, makeText } from './strings.ts';

const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** Independent print document. All customer, catalog and model text is escaped; no scripts are included. */
export function businessCaseHtml(document: BusinessCaseDocument, calculation: BusinessCaseCalculation, explanation: BusinessCaseExplanation | null, lang: BusinessCaseLang, sourceHasChanged = false): string {
  const t = makeText(lang);
  const e = (value: string) => escape(value);
  // The printed reading order starts with results, so omit the worksheet's input-step numbers.
  const heading = (key: string) => e(t(key).replace(/^\d+\.\s*/, ''));
  const scenarioHeading = { en: 'Scenario', ko: '시나리오', zh: '情景' }[lang];
  const n = (value: number | null, money = false) => e(formatNumber(value, lang, t('notAvailable'), money));
  const list = (values: string[]) => values.length ? `<ul>${values.map(value => `<li>${e(value)}</li>`).join('')}</ul>` : '';
  const fields = (Object.entries(document.inputs) as Array<[string, unknown]>)
    .filter(([key, value]) => typeof value === 'number' || (value === null && key !== 'monthlyCostOverrideUsd' && key !== 'oneTimeCostOverrideUsd'))
    .map(([key, value]) => `<tr><th>${e(t(key))}</th><td>${n(value as number | null, key.endsWith('Usd'))}</td></tr>`).join('');
  const rows: Array<{ key: Exclude<keyof ScenarioResult, 'id'>; money?: boolean }> = [
    { key: 'hoursReleasedMonthly' }, { key: 'capacityValueMonthlyUsd', money: true }, { key: 'laborCashMonthlyUsd', money: true },
    { key: 'totalCashBenefitMonthlyUsd', money: true }, { key: 'netMonthlyCashUsd', money: true }, { key: 'horizonNetCashUsd', money: true },
    { key: 'paybackMonths' }, { key: 'roiPct' }, { key: 'breakEvenEfficiencyPct' },
  ];
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${e(document.source.title)} · ${e(t('title'))}</title>
<style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,"Malgun Gothic","Microsoft YaHei",sans-serif;font-size:10pt;line-height:1.5;color:#181818}h1{font-size:23pt;line-height:1.2;margin:5px 0 14px}h2{font-size:15pt;margin:24px 0 10px;break-after:avoid}h3{font-size:12pt;margin:10px 0 5px;break-after:avoid}p{margin:6px 0 10px;overflow-wrap:anywhere}small,.meta{color:#555;font-size:9pt}.banner{padding:12px 14px;background:#edf2ff;border-left:4px solid #1354ee}.warn{padding:10px 12px;background:#fdf3e3;border-left:4px solid #a85800}.totals{display:flex;gap:12px;margin:16px 0}.totals>div{flex:1;padding:10px;border:1px solid #ddd}.totals strong{display:block;font-size:15pt;margin-top:5px}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9pt}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ddd;padding:8px 7px;overflow-wrap:anywhere}th{font-weight:600}thead th{background:#f4f5f7}th:first-child{width:40%}tr{break-inside:avoid}thead{display:table-header-group}.result{background:#edf2ff}.preserve{white-space:pre-wrap}li{margin:4px 0;overflow-wrap:anywhere}ul{padding-left:20px}.keep{break-inside:avoid}.footer{border-top:1px solid #ddd;margin-top:22px;padding-top:10px;font-size:9pt;color:#555}</style></head><body>
<p class="meta">Alichitect · ${e(t('printTitle'))}</p><h1>${e(document.source.title)}</h1><p class="banner">${e(t('workingDocument'))}</p>
<p class="meta">${e(t('captured'))}: ${e(Number.isFinite(new Date(document.source.capturedAt).getTime()) ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(document.source.capturedAt) : t('unknown'))} · ${e(t(document.source.estimateStatus))}</p>
${sourceHasChanged ? `<p class="warn">${e(t('changed'))}</p>` : ''}
<div class="totals"><div>${e(t('baselineTotal'))}<strong>${n(calculation.baselineMonthlyUsd, true)}</strong></div><div>${e(t('solutionTotal'))}<strong>${n(calculation.solutionMonthlyUsd, true)}</strong></div><div>${e(t('investmentTotal'))}<strong>${n(calculation.investmentUsd, true)}</strong></div></div>
<h2>${heading('results')}</h2><table><thead><tr><th>${e(scenarioHeading)}</th>${calculation.scenarios.map(scenario => `<th>${e(t(scenario.id))}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr${['netMonthlyCashUsd', 'horizonNetCashUsd'].includes(row.key) ? ' class="result"' : ''}><th>${e(t(row.key))}</th>${calculation.scenarios.map(scenario => `<td>${n(scenario[row.key], row.money)}</td>`).join('')}</tr>`).join('')}</tbody></table>
<p class="meta">${e(t('formula'))}</p><p class="meta">${e(t('roiFormula'))}</p>
<section class="keep"><h2>${heading('scenarios')}</h2><p>${e(t('illustrative'))}</p><table><thead><tr><th>${e(scenarioHeading)}</th>${document.inputs.scenarios.map(scenario => `<th>${e(t(scenario.id))}</th>`).join('')}</tr></thead><tbody>${(['efficiencyPct', 'cashRealizationPct', 'additionalBenefitMonthlyUsd'] as const).map(key => `<tr><th>${e(t(key))}</th>${document.inputs.scenarios.map(scenario => `<td>${n(scenario[key], key.endsWith('Usd'))}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="meta">${e(t('cashHint'))}</p></section>
<h2>${e(t('sensitivity'))}</h2><p>${e(t('sensitivityHint'))}</p><table><tbody>${calculation.sensitivity.map(item => `<tr><th>${e(t(item.id))}</th><td>${n(item.monthlyImpactUsd, true)}</td></tr>`).join('')}</tbody></table>
<h2>${e(t('poc'))}</h2><p>${e(t('pocHint'))}</p>
${explanation ? `<p class="meta">${e(t('aiLabel'))}</p><p>${e(explanation.summary)}</p><h3>${e(t('questions'))}</h3>${list(explanation.questions)}<h3>${e(t('validation'))}</h3>${list(explanation.validationSteps)}` : ''}
${calculation.missingInputs.length ? `<h2>${e(t('missingInputs'))}</h2>${list(calculation.missingInputs.map(key => fieldText(key, t)))}` : ''}
<h2>${e(t('evidence'))}</h2><table><tbody>${fields}</tbody></table>
${document.inputs.costOverrideReason ? `<h3>${e(t('costOverrideReason'))}</h3><p class="preserve">${e(document.inputs.costOverrideReason)}</p>` : ''}
${document.inputs.evidence ? `<p class="preserve">${e(document.inputs.evidence)}</p>` : ''}
<h2>${e(t('source'))}</h2><p>${e(t('sourceMonthly'))}: ${n(document.source.monthlyUsd, true)}<br>${e(t('sourceOnce'))}: ${n(document.source.oneTimeUsd, true)}</p>
${document.source.context ? `<p class="preserve">${e(document.source.context)}</p>` : ''}
${document.source.caveats.length ? `<h3>${e(t('caveats'))}</h3>${list(document.source.caveats)}` : ''}
${calculation.warnings.length ? `<h2>${e(t('warnings'))}</h2>${list(calculation.warnings.map(key => t(key)))}` : ''}
<p class="footer">Alichitect · ${e(t('workingDocument'))}</p></body></html>`;
}

/** Extract before DOM parsing: even a detached parsed <style> can trigger the hosted CSP in Chrome. */
export function businessCaseBodyHtml(document: BusinessCaseDocument, calculation: BusinessCaseCalculation, explanation: BusinessCaseExplanation | null, lang: BusinessCaseLang, sourceHasChanged = false): string {
  const html = businessCaseHtml(document, calculation, explanation, lang, sourceHasChanged);
  return html.slice(html.indexOf('<body>') + '<body>'.length, html.lastIndexOf('</body>'));
}

/** Hosted CSP disallows frames and inline styles. A temporary body child uses bundled, scoped print CSS. */
export function printBusinessCase(document: BusinessCaseDocument, calculation: BusinessCaseCalculation, explanation: BusinessCaseExplanation | null, lang: BusinessCaseLang, sourceHasChanged: boolean): void {
  const parsed = new DOMParser().parseFromString(businessCaseBodyHtml(document, calculation, explanation, lang, sourceHasChanged), 'text/html');
  const surface = window.document.createElement('article');
  surface.className = 'bc-print-document';
  surface.lang = lang;
  // Only escaped body markup is parsed and inserted; the standalone artifact's head is never parsed in this app.
  surface.append(...Array.from(parsed.body.childNodes));
  window.document.body.appendChild(surface);
  window.document.body.classList.add('bc-printing');
  const originalTitle = window.document.title;
  window.document.title = `${document.source.title} · ${makeText(lang)('title')}`;
  let cleanupTimer: ReturnType<typeof setTimeout>;
  const cleanup = () => {
    surface.remove(); window.document.body.classList.remove('bc-printing');
    window.document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
    clearTimeout(cleanupTimer);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  cleanupTimer = setTimeout(cleanup, 120_000);
  requestAnimationFrame(() => { try { window.print(); } catch { cleanup(); } });
}
