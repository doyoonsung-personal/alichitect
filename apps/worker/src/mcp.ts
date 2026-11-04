import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { Env, ExecutionContextLike } from './env.ts';
import { json } from './http.ts';
import { authenticateKey } from './mcp-keys.ts';
import { changeDesign, DesignError, getDesign } from './mcp-designs.ts';

const id = z.uuid().describe('Design ID returned by Alichitect.');
const revision = z.number().int().positive().describe('Current revision returned by get_design.');
const requestId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).describe('A new unique ID for this change. Reuse the exact ID and inputs when retrying.');
const record = z.record(z.string(), z.unknown());
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
      'Use a fresh requestId per change and reuse the exact ID and inputs after a timeout. Refresh an outdated estimate, then write the client report yourself with monthly and one-time costs, sources, assumptions and exclusions.'
    : 'This key has read-only access. Ask the user for their design ID, then use get_design to read its current design, estimate and private web link without spending a turn.';
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
  if (auth.scope === 'write') {
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
