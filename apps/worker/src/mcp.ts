import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { Env, ExecutionContextLike } from './env.ts';
import { json } from './http.ts';
import { authenticateKey } from './mcp-keys.ts';
import { changeDesign, DesignError, getDesign } from './mcp-designs.ts';
import { exportPdf } from './mcp-pdf.ts';
import { prepareWorkshop, workshopInputSchema, workshopOutputSchema } from './mcp-workshop.ts';

const id = z.uuid().describe('Design ID returned by Alichitect.');
const revision = z.number().int().positive().describe('Current revision returned by get_design.');
const requestId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).describe('A new unique ID for this change. Reuse the exact ID and inputs when retrying.');
const record = z.record(z.string(), z.unknown());
const paragraph = z.string().trim().min(1).max(3000);
const narrative = z.object({
  exec: paragraph.describe('Executive summary written by the calling agent.'),
  outcomes: z.array(z.object({ title: z.string().max(200), text: paragraph })).max(16).default([]),
  sections: z.array(z.object({ title: z.string().trim().min(1).max(200), text: paragraph })).max(12).optional(),
  needs: z.array(z.object({ id: z.string().max(100), need: paragraph, source: z.enum(['stated','inferred','general']),
    quote: paragraph.optional(), answer: paragraph, products: z.array(z.string().max(100)).max(32).default([]) })).max(32).default([]),
  why: z.record(z.string().max(100), paragraph).default({}).describe('Optional rationale keyed by catalog product ID.'),
  steps: z.record(z.string().max(100), paragraph).optional().describe('Optional explanations keyed by workflow node ID.'),
  cost: paragraph.optional().describe('Interpret the saved estimate, including unpriced items.'),
  tradeoffs: z.array(z.object({ text: paragraph, mitigation: paragraph.optional() })).max(20).default([]),
  next: z.array(paragraph).max(20).default([]),
});
const startDesign = 'Start an architecture proposal from the customer’s business goal, pain point or description of work they want automated. ' +
  'Use this first for a new solution brief, even when written as operational steps (e.g. triage tickets, validate a fix, require approval, check stock and request purchasing).';
const outputSchema = z.object({
  designId: id, revision, url: z.url().describe('Private link to open a local copy as the design owner.'),
  title: z.string(), summary: z.string().describe('Customer-facing explanation of the proposed design.'), mode: z.enum(['cloud', 'workflow']),
  architecture: record, workflow: record.optional(), requirements: z.array(z.string()),
  assumptions: z.array(record).optional(), questions: z.array(record).optional().describe('Open design questions to check against the brief before asking the customer.'),
  estimate: record.optional(), pricingReply: z.string().optional().describe('Pricing specialist’s response or next sizing question to relay to the customer.'), estimateOutdated: z.boolean().optional(),
});

export async function handleMcp(req: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (origin !== null && origin !== env.ALLOWED_ORIGIN) return json(403, { error: 'untrusted-origin' });
  const auth = await authenticateKey(req, env.DB, Date.now());
  if (!auth) return json(401, { error: 'Provide an active MCP key from Account → MCP API keys.' },
    { 'WWW-Authenticate': 'Bearer realm="Alichitect MCP"' });
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' }, { Allow: 'POST' });
  const instructions = auth.scope === 'write'
    ? startDesign + ' When the user selects Alichitect for such a brief, call design_solution on the first turn using the facts already provided. ' +
      'Use mode="workflow" for a sequence of business steps, integrations or approval gates. External systems are proposed integration points; a draft does not need live access to them. ' +
      'Honor explicit execution-only requests by describing the capability boundary; never imply that a ticket, test, production change or purchase actually happened. ' +
      'Present the returned design in the customer’s language, include its private URL, and ask one or two concrete unanswered questions about fit or cost. ' +
      'Keep the designId and revision. Use design_solution for design changes and estimate_solution to start sizing or collect usage answers, even before every price is known. ' +
      'Use pricingReply and unknowns for the next question. Check the source material before asking. get_design reads the latest revision without spending a turn. ' +
      'Use a fresh requestId per change and reuse the exact ID and inputs after a timeout. Refresh an outdated estimate, then write the client report yourself with monthly and one-time costs, sources, assumptions and exclusions. ' +
      'When the customer wants a handoff PDF, call export_proposal_pdf with the latest revision. Default audience="client" emphasizes supported Alibaba Cloud value for this customer; choose audience="alibaba" only for an internal SA/account brief. Pass any useful editorial notes; the proposal writer prepares the final report. Give the customer the private download link. ' +
      'For a workshop, presentation or discussion deck, call prepare_workshop with the designId. Use its saved evidence and authoring instructions with your own model and file tools to create a local standalone HTML deck. This read-only call uses no model turn and returns no rendered or hosted deck.'
    : 'This key has read-only access. Ask the user for their design ID, then use get_design to read its current design, estimate and private web link without spending a turn. For a workshop or presentation, call prepare_workshop for saved evidence and authoring instructions, then use your own model and tools to create the local standalone HTML deck. Neither read tool generates or hosts a deck or spends a model turn.';
  const server = new McpServer({ name: 'alichitect', version: '1.0.0' }, { instructions });
  async function result(work: Promise<Awaited<ReturnType<typeof getDesign>>>) {
    // A dropped IDE connection should not abandon a billed edit before its receipt is durable.
    ctx.waitUntil(work.then(() => undefined, () => undefined));
    try {
      const value = await work;
      return { content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: value };
    } catch (error) {
      return { isError: true, content: [{ type: 'text' as const, text: error instanceof DesignError ? error.message : 'Service unavailable.' }] };
    }
  }
  server.registerTool('get_design', {
    description: 'Read the latest saved architecture, estimate, open questions and private web link. Uses no model turn.',
    inputSchema: z.object({ designId: id }), outputSchema, annotations: { readOnlyHint: true }
  },
    ({ designId }) => result(getDesign(env, auth.user, designId)));
  server.registerTool('prepare_workshop', {
    title: 'Prepare a workshop or presentation brief',
    description: 'Prepare a workshop, presentation or discussion deck from a saved design. Returns the latest owner-scoped snapshot, current cost evidence, focused discussion prompts and instructions for YOU to create a local standalone HTML deck with your own model and file tools. Uses no model turn. Both read-only and read/write keys can use it. Does not generate, render, save or host a deck; stale estimate figures are withheld.',
    inputSchema: workshopInputSchema, outputSchema: workshopOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async args => {
    try {
      const value = await prepareWorkshop(env, auth.user, args);
      return { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof DesignError ? error.message : 'Could not read the workshop brief.' }] };
    }
  });
  if (auth.scope === 'write') {
    server.registerTool('export_proposal_pdf', {
      title: 'Export the proposal as a PDF',
      description: 'Queue an audience-specific proposal from the saved revision, customer conversation and pricing. Choose client for a customer value proposition or alibaba for an internal solution brief. The proposal writer uses one account writing turn per audience. Optional narrative supplies editorial notes. If status is preparing, give the owner the private link immediately. For local file requests, poll the same inputs after retryAfterSeconds until ready and save the embedded PDF. A completed export is reused.',
      inputSchema: z.object({
        designId: id, revision, lang: z.enum(['en','ko','zh']), title: z.string().trim().max(180).optional(),
        audience: z.enum(['client','alibaba']).default('client').describe('Client-facing Alibaba Cloud value proposition, or internal Alibaba personnel solution brief.'),
        customer: z.string().trim().max(160).optional(), narrative: narrative.optional(), includeFile: z.boolean().default(false),
        retryFailed: z.boolean().default(false).describe('Request another writing pass after a failed export.'),
      }), annotations: { destructiveHint: false, idempotentHint: true },
    }, async ({ designId, revision, lang, title, customer, audience, narrative, includeFile, retryFailed }) => {
      try {
        return await exportPdf(env, auth.user, designId, revision, { lang, title, customer, audience,
          draft: narrative && { ...narrative, lang, audience, complete: true } }, includeFile, retryFailed);
      } catch (err) {
        return { isError: true, content: [{ type: 'text', text: err instanceof DesignError ? err.message : 'Could not generate the PDF. Retry this export.' }] };
      }
    });
    server.registerTool('design_solution', {
      title: 'Draft or revise a solution proposal',
      description: startDesign + ' Call with the customer’s brief, present the returned design and private link, then ask the most useful unanswered sizing question. Requires no live customer integrations and performs no external operations. Uses the account turn allowance.',
      inputSchema: z.object({
        ask: z.string().trim().min(1).max(6000).describe('The customer’s original brief or requested revision, in their language; preserve steps, conditions and constraints.'),
        mode: z.enum(['cloud', 'workflow']).optional().describe('Choose workflow for business processes, branching or human approvals; cloud for infrastructure topology and deployment.'),
        designId: id.optional(), revision: revision.optional(), requestId
      }), outputSchema, annotations: { idempotentHint: true, destructiveHint: false }
    },
      args => result(changeDesign('design_solution', args, env, ctx, auth.user)));
    server.registerTool('estimate_solution', {
      title: 'Start or continue the cost estimate',
      description: 'Start the pricing interview for a saved design using the known facts, even when quantities are missing. Use pricingReply to ask the customer the next sizing question; call again with their answer and the latest revision. Returns monthly and one-time USD estimates, assumptions and unpriced items.',
      inputSchema: z.object({
        ask: z.string().trim().min(1).max(2000), designId: id, revision, requestId,
        lang: z.enum(['en', 'ko', 'zh']).optional().describe('Language of the customer’s pricing conversation.')
      }), outputSchema, annotations: { idempotentHint: true, destructiveHint: false }
    },
      args => result(changeDesign('estimate_solution', args, env, ctx, auth.user)));
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 64 * 1024 });
  await server.connect(transport);
  const response = await transport.handleRequest(req);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
