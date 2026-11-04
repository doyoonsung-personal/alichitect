import type { ProposalDraft, SessionMemory, TurnMode } from '../../../packages/core/src/types.ts';
import type { PricingSession } from '../../../packages/core/src/solution-pricing.ts';

export interface PdfDesign {
  designId: string; revision: number; updatedAt: number; title: string; summary: string;
  mode: TurnMode; memory: SessionMemory; pricing?: PricingSession;
}
export interface PdfOptions {
  title?: string; customer?: string; lang: ProposalDraft['lang']; draft?: ProposalDraft;
}
export type RenderProposal = (design: PdfDesign, options: PdfOptions, asset: (path: string) => Promise<Response>)
  => Promise<{ bytes: Uint8Array; fileName: string }>;
