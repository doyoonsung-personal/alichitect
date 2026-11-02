// Browser-safe model metadata shared by workflow presentation.
import { createModelTable } from '@ali/core/models.ts';
import type { ModelFile } from '@ali/core/models.ts';
import data from '@ali/catalog/models.json' with { type: 'json' };
export const models = createModelTable(data as ModelFile);
