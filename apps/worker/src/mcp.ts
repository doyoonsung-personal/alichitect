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
const outputSchema = z.object({
  designId: id, revision, url: z.url().describe('Private link to open a local copy as the design owner.'),
  title: z.string(), summary: z.string(), mode: z.enum(['cloud', 'workflow']),
  architecture: record, workflow: record.optional(), requirements: z.array(z.string()),
  assumptions: z.array(record).optional(), questions: z.array(record).optional(),
  estimate: record.optional(), pricingReply: z.string().optional(), estimateOutdated: z.boolean().optional(),
});

export async function handleMcp(req: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
  const origin = req.headers.get('Origin');
  if (origin !== null && origin !== env.ALLOWED_ORIGIN) return json(403, { error: 'untrusted-origin' });
  const auth = await authenticateKey(req, env.DB, Date.now());
  if (!auth) return json(401, { error: 'Provide an active MCP key from Account → MCP API keys.' },
    { 'WWW-Authenticate': 'Bearer realm="Alichitect MCP"' });
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' }, { Allow: 'POST' });
  const server = new McpServer({ name: 'alichitect', version: '1.0.0' });
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
      description: 'Design an Alibaba Cloud architecture or AI workflow from a brief. To revise, include the design ID and its latest revision. Uses the account turn allowance.',
      inputSchema: z.object({
        ask: z.string().trim().min(1).max(6000), mode: z.enum(['cloud', 'workflow']).optional(),
        designId: id.optional(), revision: revision.optional(), requestId
      }), outputSchema, annotations: { idempotentHint: true }
    },
      args => result(changeDesign('design_solution', args, env, ctx, auth.user)));
    server.registerTool('estimate_solution', {
      description: 'Price a saved design, answer a pricing question, or correct usage. Returns separate monthly and one-time USD amounts and unpriced items.',
      inputSchema: z.object({
        ask: z.string().trim().min(1).max(2000), designId: id, revision, requestId,
        lang: z.enum(['en', 'ko', 'zh']).optional()
      }), outputSchema, annotations: { idempotentHint: true }
    },
      args => result(changeDesign('estimate_solution', args, env, ctx, auth.user)));
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 64 * 1024 });
  await server.connect(transport);
  const response = await transport.handleRequest(req);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
