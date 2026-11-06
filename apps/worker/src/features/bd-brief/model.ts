// The BD brief model adapter (plan §4 rule 5): reuse ONLY the platform's low-level model transport
// (packages/core llm.ts complete()) behind the module's injected ModelAdapter interface. Nothing else from the
// turn pipeline is reused: no catalog, no system prompt, no failover, no turn counters. Model choice lives in
// policy.ts, separate from the architecture/pricing/proposal settings (plan §8).
import type { Env } from '../../env.ts';
import { DEFAULT_BASE_URL, complete } from '../../../../../packages/core/src/llm.ts';
import type { ModelAdapter } from '../../../../../packages/bd-brief/src/types.ts';
import { LIMITS } from '../../../../../packages/bd-brief/src/types.ts';
import { bdBriefModel } from './policy.ts';

/**
 * The typed failure the routes map to a structured 'generation-failed' response. The message carries only the
 * llm.ts error code/message (already redacted there); it must never carry key material.
 */
export class ModelUnavailableError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(code: string, message: string, retryable = true) {
    super(`bd-brief model unavailable: ${code}: ${message}`);
    this.name = 'ModelUnavailableError';
    this.code = code;
    this.retryable = retryable;
  }
}

/** The same base-URL rule as turn.ts turnConfig (https-only override, else the default), without coupling to its model choice. */
function baseUrlOf(env: Env): string {
  const base = env.QWEN_BASE_URL?.trim();
  return base && /^https:\/\//.test(base) ? base : DEFAULT_BASE_URL;
}

export function createBdBriefModel(env: Env, deps: { fetchImpl?: typeof fetch } = {}): ModelAdapter {
  return {
    async complete(req) {
      const apiKey = env.DASHSCOPE_API_KEY?.trim();
      if (!apiKey) throw new ModelUnavailableError('no-key', 'DASHSCOPE_API_KEY is not configured', false);
      const res = await complete({
        apiKey,
        baseUrl: baseUrlOf(env),
        model: bdBriefModel(env),
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        maxTokens: req.maxOutputTokens ?? LIMITS.modelOutputTokens,
        // Flash with thinking disabled: one bounded call inside the generation deadline (plan §8)
        extraBody: { enable_thinking: false },
        ...(req.signal ? { signal: req.signal } : {}),
        firstByteTimeoutMs: 10_000,
        idleTimeoutMs: 15_000,
        ...(req.deadlineMs !== undefined ? { totalTimeoutMs: req.deadlineMs } : {}),
        // prices omitted on purpose: cost is still tracked from the returned usage, booked on the request row
        ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
      });
      if (res.error) throw new ModelUnavailableError(res.error.code, res.error.message, res.error.retryable);
      return {
        text: res.text,
        usage: res.usage ? { inputTokens: res.usage.prompt_tokens ?? 0, outputTokens: res.usage.completion_tokens ?? 0 } : null,
      };
    },
  };
}
