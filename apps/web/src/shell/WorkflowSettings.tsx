import { models } from '../workflow/models.ts';
import type { Effect } from '@ali/core/types.ts';
import { APPROVAL_POLICY } from '@ali/core/approval.ts';
import { approvalOverride } from '../workflow/settings.ts';
import type { WorkflowSettingsProps } from '../workflow/contracts.ts';
export function WorkflowSettings(p: WorkflowSettingsProps) {
  const { t, settings, actions } = p;
  return <fieldset className="workflow-settings" disabled={p.disabled}>
    <legend className="visually-hidden">{t('workflow.settings.title')}</legend>
    <label>{t('workflow.settings.region')}
      <select value={settings.region ?? 'ap-southeast-1'} onChange={(e) =>
        actions.setWorkflowSettings({ ...settings, region: e.target.value })}>
        {[...new Set(['ap-southeast-1', ...(settings.region ? [settings.region] : []),
          ...models.models.flatMap((m) => m.regions)])].map((region) => <option key={region} value={region}>{region}</option>)}
      </select>
    </label>
    <label>{t('workflow.settings.scope')}
      <select value={p.estimateSettings.scope ?? 'international'} onChange={(e) =>
        actions.setWorkflowEstimate({ ...p.estimateSettings, scope: e.target.value as 'international' | 'global' })}>
        <option value="international">{t('workflow.settings.international')}</option>
        <option value="global">{t('workflow.settings.global')}</option>
      </select>
    </label>
    <details><summary>{t('workflow.settings.approvals')}</summary><div className="workflow-approvals">
      {(Object.keys(APPROVAL_POLICY) as Effect[]).map((effect) => <label key={effect}>
        {t('workflow.effect.' + effect as 'workflow.effect.read')}
        <select value={settings.approvalOn?.includes(effect) ? 'require' : settings.approvalOff?.includes(effect) ? 'waive' : 'default'}
          onChange={(e) => actions.setWorkflowSettings(approvalOverride(settings, effect, e.target.value as 'default' | 'require' | 'waive'))}>
          {(['default', 'require', 'waive'] as const).map((v) =>
            <option key={v} value={v}>{t('workflow.settings.' + v as 'workflow.settings.default')}</option>)}
        </select>
      </label>)}
    </div></details>
    <small>{t('workflow.settings.nextTurn')}</small>
  </fieldset>;
}
