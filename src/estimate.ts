import { PriceRegistry, TokenUsage, CostEstimate } from './types';
import { getPrice } from './lookup';

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function estimateCost(
  registry: PriceRegistry,
  provider: string,
  model: string,
  usage: TokenUsage,
): CostEstimate | undefined {
  const entry = getPrice(registry, provider, model);
  if (!entry) return undefined;

  let inputRate = entry.inputPerMTok;
  let outputRate = entry.outputPerMTok;

  // Apply tiered pricing if applicable
  if (entry.tiers && entry.tiers.length > 0) {
    // Find the highest tier that applies (tiers should be sorted by minInputTokens ascending)
    for (const tier of entry.tiers) {
      if (usage.inputTokens >= tier.minInputTokens) {
        inputRate = tier.inputPerMTok;
        outputRate = tier.outputPerMTok;
      }
    }
  }

  const cachedInputTokens = usage.cachedInputTokens ?? 0;
  // If model has cached pricing, use it; otherwise bill at full input rate
  const cachedRate = entry.cachedInputPerMTok ?? inputRate;

  const inputCost = round6(usage.inputTokens / 1_000_000 * inputRate);
  const outputCost = round6(usage.outputTokens / 1_000_000 * outputRate);
  const cachedInputCost = round6(cachedInputTokens / 1_000_000 * cachedRate);
  const totalCost = round6(inputCost + outputCost + cachedInputCost);

  return {
    provider: entry.provider,
    modelId: entry.modelId,
    inputCost,
    outputCost,
    cachedInputCost,
    totalCost,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cachedInputTokens,
    currency: 'USD',
  };
}
