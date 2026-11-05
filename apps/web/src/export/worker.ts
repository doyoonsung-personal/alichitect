// Worker entry for the web proposal renderer. All asset reads use the application's private assets binding.
import type { RenderProposal } from '../../../worker/src/mcp-pdf-types.ts';
import kr from '@fontsource/noto-sans-kr/400.css?raw';
import sc from '@fontsource/noto-sans-sc/400.css?raw';
import { catalog } from '../catalog/catalog.ts';
import { DEFAULT_CANVAS, layoutFor } from '../canvas/layout.ts';
import { LOGOS } from '../icons/brand.generated.ts';
import { routeChannels } from '../routing/channel.ts';
import { newSessionRecord, emptyRevision } from '../store/reducer.ts';
import type { SessionRecord } from '../store/types.ts';
import { generateProposalPdf } from './generate.ts';
declare const __PDF_FONT_PATHS__: Record<string, string>;

export const renderProposal: RenderProposal = async (d, options, asset) => {
  const session: SessionRecord = {
    ...newSessionRecord(d.designId, d.updatedAt), memory: d.memory, title: d.title, mode: d.mode,
    revisions: [{ ...emptyRevision(d.revision, d.title, d.updatedAt), status: 'done', note: d.summary, mode: d.mode }],
    pricing: d.pricing,
  };
  const brand = LOGOS[options.lang === 'zh' ? 'zh' : 'en'];
  const result = await generateProposalPdf({
    session, graph: d.memory.graph, layout: layoutFor(d.memory.graph, catalog, null, DEFAULT_CANVAS),
    catalog, lang: options.lang, title: options.title || d.title, customer: options.customer || '',
    now: new Date(d.updatedAt), audience: options.audience, draft: options.draft, route: async request => routeChannels(request),
    logo: { svg: await (await asset('/' + brand.file)).text(), aspect: brand.aspect },
    fontSource: {
      css: async family => family === 'kr' ? kr : sc,
      async file(family, slice, weight) {
        const w = slice === 'latin' || slice === 'latin-ext' ? weight : weight >= 600 ? 700 : 400;
        const path = __PDF_FONT_PATHS__[`noto-sans-${family}-${slice}-${w}-normal`];
        if (!path) throw Error('Missing PDF font slice');
        return new Uint8Array(await (await asset(path)).arrayBuffer());
      },
    },
  });
  return { bytes: result.bytes, fileName: result.fileName };
};
