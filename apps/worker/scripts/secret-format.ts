// The shape check put-secret.ts runs before it sends a secret to Cloudflare: the two API keys are easy to swap (both are
// "sk-" keys), and a swapped pair would put the Anthropic key where Model Studio's goes and the other way round. The
// messages never contain the value. Pure, so a test can run it.

const ANTHROPIC_PREFIX = 'sk-ant-';

/** A reason the value cannot be this secret, or null when its shape is right. */
export function secretProblem(name: string, value: string): string | null {
  const anthropic = value.startsWith(ANTHROPIC_PREFIX);
  if (name === 'ANTHROPIC_API_KEY' && !anthropic) return `${name} must start with ${ANTHROPIC_PREFIX}: this value does not look like an Anthropic API key. Nothing was set.`;
  if (name === 'DASHSCOPE_API_KEY' && anthropic) return `${name} starts with ${ANTHROPIC_PREFIX}: that is an Anthropic key, not a Model Studio key. Nothing was set.`;
  return null;
}
