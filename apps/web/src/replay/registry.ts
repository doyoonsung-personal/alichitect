// The app's view of the recorded conversations: the manifest, and each fixture loaded on demand (one chunk each, so
// the landing page does not carry them). Tests read the same JSON files from disk instead (src/test/fixtures.ts).
import manifestJson from './fixtures/index.json';
import type { Fixture, FixtureInfo } from './plan.ts';

export const manifest: FixtureInfo[] = manifestJson as FixtureInfo[];

const loaders = import.meta.glob(['./fixtures/*.json', '!./fixtures/index.json'], { import: 'default' }) as Record<string, () => Promise<unknown>>;

export function hasFixture(id: string): boolean {
  return Object.hasOwn(loaders, `./fixtures/${id}.json`);
}

export async function loadFixture(id: string): Promise<Fixture | null> {
  if (!hasFixture(id)) return null;
  try {
    return (await loaders[`./fixtures/${id}.json`]()) as Fixture;
  } catch {
    return null;
  }
}

/** Which recording to offer for a brief, by language (the landing's offline notice uses it). */
export function defaultFixtureFor(lang: 'en' | 'ko' | 'zh', exampleId?: string): string {
  if (lang === 'ko') return 'korean';
  if (lang === 'zh') return 'chinese';
  const byExample: Record<string, string> = { residency: 'residency', ha: 'ha', need: 'ai-agent', k8s: 'ecommerce-k8s' };
  return (exampleId && byExample[exampleId]) || 'ecommerce';
}
