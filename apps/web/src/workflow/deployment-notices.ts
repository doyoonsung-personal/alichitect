import type { Catalog, SessionMemory } from '@ali/core/types.ts';
import { deploymentWarnings } from '@ali/core/workflow-deployment.ts';
import type { TFn } from '../i18n/t.ts';

export function deploymentNotices(memory: SessionMemory, catalog: Catalog, t: TFn): string[] {
  return deploymentWarnings(memory).map(w => w.code === 'wf-deploy-stale' ? t('deployment.stale')
    : t('deployment.missing', { services: w.ids.map(id => catalog.byId.get(id)?.name ?? id).join(', ') }));
}
