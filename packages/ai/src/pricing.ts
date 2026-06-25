// Claude API pricing, USD per 1M tokens. Source: Anthropic pricing (2026-05).
// Matched by substring so dated model IDs (e.g. claude-haiku-4-5-20251001) resolve.
export interface ModelRate {
  inputPerMtok: number;
  outputPerMtok: number;
}

const MODEL_RATES: Array<{ match: string; rate: ModelRate }> = [
  { match: "fable-5", rate: { inputPerMtok: 10, outputPerMtok: 50 } },
  { match: "opus-4", rate: { inputPerMtok: 5, outputPerMtok: 25 } },
  { match: "sonnet-4", rate: { inputPerMtok: 3, outputPerMtok: 15 } },
  { match: "haiku-4", rate: { inputPerMtok: 1, outputPerMtok: 5 } }
];

// Cache reads bill at ~0.1x input; cache writes at ~1.25x input (5-minute TTL).
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export function rateForModel(model: string): ModelRate | undefined {
  return MODEL_RATES.find((entry) => model.includes(entry.match))?.rate;
}

/** Estimated USD cost of one Messages API call. Undefined when the model is unpriced. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | undefined {
  const rate = rateForModel(model);
  if (!rate) return undefined;
  const perMtok = (tokens: number, price: number) => (tokens / 1_000_000) * price;
  return (
    perMtok(usage.inputTokens, rate.inputPerMtok) +
    perMtok(usage.outputTokens, rate.outputPerMtok) +
    perMtok(usage.cacheReadTokens, rate.inputPerMtok * CACHE_READ_MULTIPLIER) +
    perMtok(usage.cacheWriteTokens, rate.inputPerMtok * CACHE_WRITE_MULTIPLIER)
  );
}
