import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient() {
  // One retry, short timeout: a patient is waiting, and every caller has a
  // deterministic fallback that is better than a spinner.
  client ??= new Anthropic({ maxRetries: 1, timeout: 25_000 });
  return client;
}

export class AIUnavailable extends Error {}

type StructuredArgs<S extends z.ZodType> = {
  schema: S;
  system: string;
  user: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  timeoutMs?: number;
};

/**
 * One structured-output call. Throws AIUnavailable on anything other than a
 * clean, schema-valid answer — callers fall back rather than guess.
 */
export async function structured<S extends z.ZodType>({
  schema,
  system,
  user,
  effort = "low",
  maxTokens = 8000,
  timeoutMs = 25_000,
}: StructuredArgs<S>): Promise<{ data: z.infer<S>; model: string; latencyMs: number }> {
  if (!aiConfigured()) throw new AIUnavailable("No Anthropic credentials configured");
  const started = Date.now();
  let response;
  try {
    response = await getClient().beta.messages.parse(
      {
        model: MODEL,
        max_tokens: maxTokens,
        // Server-side fallback: if a safety classifier declines, the API
        // re-runs on Anthropic's recommended fallback model in the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // The system prompt is frozen per task, so it caches across patients.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
        output_config: { effort, format: betaZodOutputFormat(schema) },
      },
      { timeout: timeoutMs },
    );
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new AIUnavailable(`Claude API error ${err.status ?? ""}: ${err.message}`.trim());
    }
    throw new AIUnavailable(err instanceof Error ? err.message : "Claude request failed");
  }
  if (response.stop_reason === "refusal") throw new AIUnavailable("Model declined the request");
  if (response.stop_reason === "max_tokens") throw new AIUnavailable("Model output was truncated");
  if (!response.parsed_output) throw new AIUnavailable("Model output did not match the schema");
  return { data: response.parsed_output as z.infer<S>, model: response.model, latencyMs: Date.now() - started };
}
