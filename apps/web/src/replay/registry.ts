// The app's view of the recorded conversations, each loaded on demand (one chunk each, so the landing page does not
// carry them). Tests read the same JSON files from disk instead (src/test/fixtures.ts).
//
// Two sets, because the production build ships less (src/app/tools.ts):
//  - shipped: the real recordings the offline notice offers ("Replay a recorded session"), one per language and per
//    example brief, as defaultFixtureFor below picks them. They are the only fixtures in the production bundle.
//  - the rest (the synthetic stub-* and asks-* sessions that the screenshot scripts use for error and ask states, and
//    chinese-fix): loaded only when the tools are on, so the production bundle holds none of them.
import type { Fixture } from './plan.ts';

const shipped = import.meta.glob(['./fixtures/*.json', '!./fixtures/index.json', '!./fixtures/stub-*.json', '!./fixtures/asks-*.json', '!./fixtures/chinese-fix.json'], { import: 'default' }) as Record<string, () => Promise<unknown>>;
// __AB_TOOLS__ is written out here, not read through TOOLS: the bundler folds the literal and drops the unused chunks
const extra = (typeof __AB_TOOLS__ !== 'undefined' && __AB_TOOLS__ ? import.meta.glob(['./fixtures/stub-*.json', './fixtures/asks-*.json', './fixtures/chinese-fix.json'], { import: 'default' }) : {}) as Record<string, () => Promise<unknown>>;
const loaders: Record<string, () => Promise<unknown>> = { ...shipped, ...extra };

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
