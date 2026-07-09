import Anthropic from '@anthropic-ai/sdk';

// Claude is the brain of the pipeline. Strategies call complete/completeJSON
// and MUST fall back to a deterministic heuristic when `enabled` is false or
// a call throws — the demo never blocks on a missing key, and every teammate
// can run the pipeline without credentials.
export function createLlm() {
  const enabled = Boolean(process.env.ANTHROPIC_API_KEY);
  const model = process.env.CLAUDE_MODEL || 'claude-opus-4-8';
  const client = enabled ? new Anthropic() : null;

  return {
    enabled,
    model,

    async complete({ system, prompt, maxTokens = 1024 }) {
      if (!enabled) return null;
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
    },

    // Structured output: the schema is enforced server-side, so the result is
    // guaranteed-parseable JSON (or null when Claude is unavailable).
    async completeJSON({ system, prompt, schema, maxTokens = 1024 }) {
      if (!enabled) return null;
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        output_config: { format: { type: 'json_schema', schema } },
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content.find((block) => block.type === 'text')?.text;
      return text ? JSON.parse(text) : null;
    },
  };
}
