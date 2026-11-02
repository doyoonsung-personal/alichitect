// The browser end of the export: the Vite font source, the libavoid router (with the channel router as the fallback),
// the logo file, and the download. This module is loaded with import() when the person asks for the PDF, so pdfkit,
// svg-to-pdfkit, fontkit and the router stay out of the app's first load.
import type { Catalog, ProposalDraft } from '@ali/core/types.ts';
import { LOGOS } from '../icons/brand.generated.ts';
import { routeWithBudget } from '../routing/budget.ts';
import { createAvoidPort } from '../routing/avoid-port.ts';
import { routeChannels } from '../routing/channel.ts';
import type { RouteRequest, RouteResult } from '../routing/types.ts';
import type { AppState } from '../store/types.ts';
import { webFontSource } from './fonts-web.ts';
import { generateProposalPdf } from './generate.ts';
import type { GenerateResult } from './generate.ts';

/** libavoid in a worker gets a generous budget here (the first call loads the WASM); the channel router answers if it is late. */
const EXPORT_ROUTE_BUDGET_MS = 3000;

async function route(req: RouteRequest): Promise<RouteResult> {
  const port = createAvoidPort();
  try {
    const r = await routeWithBudget(req, { avoid: port, channel: routeChannels, budgetMs: EXPORT_ROUTE_BUDGET_MS });
    return r.result;
  } finally {
    port?.dispose();
  }
}

async function loadLogo(lang: AppState['lang']): Promise<{ svg: string; aspect: number } | null> {
  const logo = lang === 'zh' ? LOGOS.zh : LOGOS.en;
  try {
    const res = await fetch(import.meta.env.BASE_URL + logo.file);
    if (!res.ok) return null;
    return { svg: await res.text(), aspect: logo.aspect };
  } catch {
    return null;
  }
}

export interface ExportRequest {
  state: AppState;
  catalog: Catalog;
  title: string;
  customer: string;
  /** The drafted narrative; null or absent lays out the basic version. */
  draft?: ProposalDraft | null;
}

/** Lays out the PDF for the session on screen, in this tab. The narrative, when there is one, was drafted before this. */
export async function exportProposalPdf(r: ExportRequest): Promise<GenerateResult> {
  const { state } = r;
  return generateProposalPdf({
    session: state.session,
    graph: state.display.graph,
    layout: state.display.layout,
    catalog: r.catalog,
    lang: state.lang,
    title: r.title,
    customer: r.customer,
    now: new Date(),
    fontSource: webFontSource(),
    route,
    logo: await loadLogo(state.lang),
    draft: r.draft ?? null,
  });
}

/** Hands the bytes to the browser's download, with no print dialog. */
export function saveBytes(bytes: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
