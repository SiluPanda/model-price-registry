import { describe, it, expect } from 'vitest';
import { registry } from '../registry';
import { estimateCost } from '../estimate';

describe('estimateCost', () => {
  describe('basic cost calculation', () => {
    it('calculates input cost for 1M tokens at gpt-4o rate ($2.50/MTok)', () => {
      // gpt-4o: inputPerMTok=2.50, outputPerMTok=10.00, cachedInputPerMTok=1.25
      const result = estimateCost(registry, 'openai', 'gpt-4o', {
        inputTokens: 1_000_000,
        outputTokens: 0,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(2.50);
      expect(result!.outputCost).toBe(0);
      expect(result!.cachedInputCost).toBe(0);
      expect(result!.totalCost).toBe(2.50);
    });

    it('calculates output cost for 1M tokens at gpt-4o rate ($10.00/MTok)', () => {
      const result = estimateCost(registry, 'openai', 'gpt-4o', {
        inputTokens: 0,
        outputTokens: 1_000_000,
      });
      expect(result).toBeDefined();
      expect(result!.outputCost).toBe(10.00);
      expect(result!.inputCost).toBe(0);
      expect(result!.totalCost).toBe(10.00);
    });

    it('calculates combined input and output cost correctly', () => {
      // gpt-4o-mini: inputPerMTok=0.15, outputPerMTok=0.60
      // 500K input: 0.5 * 0.15 = 0.075
      // 200K output: 0.2 * 0.60 = 0.12
      // total = 0.195
      const result = estimateCost(registry, 'openai', 'gpt-4o-mini', {
        inputTokens: 500_000,
        outputTokens: 200_000,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(0.075);
      expect(result!.outputCost).toBe(0.12);
      expect(result!.totalCost).toBe(0.195);
    });

    it('sets provider and modelId correctly on the result', () => {
      const result = estimateCost(registry, 'openai', 'gpt-4o', {
        inputTokens: 1000,
        outputTokens: 500,
      });
      expect(result).toBeDefined();
      expect(result!.provider).toBe('openai');
      expect(result!.modelId).toBe('gpt-4o');
      expect(result!.currency).toBe('USD');
    });

    it('echoes token counts back on the result', () => {
      const result = estimateCost(registry, 'openai', 'gpt-4o', {
        inputTokens: 123456,
        outputTokens: 78910,
      });
      expect(result).toBeDefined();
      expect(result!.inputTokens).toBe(123456);
      expect(result!.outputTokens).toBe(78910);
      expect(result!.cachedInputTokens).toBe(0);
    });
  });

  describe('cached input tokens', () => {
    it('calculates cached input cost at gpt-4o cached rate ($1.25/MTok)', () => {
      // gpt-4o: cachedInputPerMTok=1.25
      // 500K cached: 0.5 * 1.25 = 0.625
      const result = estimateCost(registry, 'openai', 'gpt-4o', {
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 500_000,
      });
      expect(result).toBeDefined();
      expect(result!.cachedInputCost).toBe(0.625);
      expect(result!.cachedInputTokens).toBe(500_000);
    });

    it('calculates cached input cost for claude-sonnet-4-5 ($0.30/MTok)', () => {
      // claude-sonnet-4-5: cachedInputPerMTok=0.30
      // 1M cached: 1.0 * 0.30 = 0.30
      const result = estimateCost(registry, 'anthropic', 'claude-sonnet-4-5', {
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 1_000_000,
      });
      expect(result).toBeDefined();
      expect(result!.cachedInputCost).toBe(0.30);
    });

    it('defaults cachedInputTokens to 0 when not provided', () => {
      const result = estimateCost(registry, 'openai', 'gpt-4o', {
        inputTokens: 100_000,
        outputTokens: 50_000,
      });
      expect(result).toBeDefined();
      expect(result!.cachedInputTokens).toBe(0);
      expect(result!.cachedInputCost).toBe(0);
    });

    it('includes cached cost in total cost', () => {
      // gpt-4o: input=2.50, cached=1.25, output=10.00
      // 100K input: 0.1 * 2.50 = 0.25
      // 50K output: 0.05 * 10.00 = 0.50
      // 200K cached: 0.2 * 1.25 = 0.25
      // total = 1.00
      const result = estimateCost(registry, 'openai', 'gpt-4o', {
        inputTokens: 100_000,
        outputTokens: 50_000,
        cachedInputTokens: 200_000,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(0.25);
      expect(result!.outputCost).toBe(0.5);
      expect(result!.cachedInputCost).toBe(0.25);
      expect(result!.totalCost).toBe(1.0);
    });
  });

  describe('tiered pricing', () => {
    it('uses base rate for claude-sonnet-4-5 when input tokens are below the 200K tier threshold', () => {
      // claude-sonnet-4-5: base inputPerMTok=3.00, tier at >= 200_000 tokens: inputPerMTok=6.00
      // 100K tokens < 200K threshold → use base rate 3.00
      // inputCost = 0.1 * 3.00 = 0.30
      const result = estimateCost(registry, 'anthropic', 'claude-sonnet-4-5', {
        inputTokens: 100_000,
        outputTokens: 0,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(0.30);
    });

    it('applies higher tier rate for claude-sonnet-4-5 when input tokens meet the 200K threshold', () => {
      // claude-sonnet-4-5: tier at >= 200_000 tokens: inputPerMTok=6.00, outputPerMTok=30.00
      // 300K tokens >= 200K → use tier rate 6.00
      // inputCost = 0.3 * 6.00 = 1.80
      const result = estimateCost(registry, 'anthropic', 'claude-sonnet-4-5', {
        inputTokens: 300_000,
        outputTokens: 0,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(1.80);
    });

    it('applies higher tier output rate for claude-sonnet-4-5 when input meets threshold', () => {
      // claude-sonnet-4-5: tier at >= 200_000: outputPerMTok=30.00
      // 200K input (triggers tier), 100K output: 0.1 * 30.00 = 3.00
      const result = estimateCost(registry, 'anthropic', 'claude-sonnet-4-5', {
        inputTokens: 200_000,
        outputTokens: 100_000,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(1.20); // 0.2 * 6.00
      expect(result!.outputCost).toBe(3.00); // 0.1 * 30.00
    });

    it('uses base rate for gemini-2.5-pro when input tokens are below the 200K tier threshold', () => {
      // gemini-2.5-pro: base inputPerMTok=1.25
      // 50K tokens < 200K → use base 1.25
      // inputCost = 0.05 * 1.25 = 0.0625
      const result = estimateCost(registry, 'google', 'gemini-2.5-pro', {
        inputTokens: 50_000,
        outputTokens: 0,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(0.0625);
    });

    it('applies higher tier rate for gemini-2.5-pro when input tokens meet the 200K threshold', () => {
      // gemini-2.5-pro: tier at >= 200_000: inputPerMTok=2.50
      // 500K tokens >= 200K → use tier 2.50
      // inputCost = 0.5 * 2.50 = 1.25
      const result = estimateCost(registry, 'google', 'gemini-2.5-pro', {
        inputTokens: 500_000,
        outputTokens: 0,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(1.25);
    });
  });

  describe('unknown model/provider', () => {
    it('returns undefined for an unknown model', () => {
      expect(
        estimateCost(registry, 'openai', 'gpt-does-not-exist', {
          inputTokens: 1000,
          outputTokens: 500,
        }),
      ).toBeUndefined();
    });

    it('returns undefined for an unknown provider', () => {
      expect(
        estimateCost(registry, 'unknown-provider', 'gpt-4o', {
          inputTokens: 1000,
          outputTokens: 500,
        }),
      ).toBeUndefined();
    });
  });

  describe('rounding', () => {
    it('rounds values to 6 decimal places', () => {
      // gemini-1.5-flash: inputPerMTok=0.075, outputPerMTok=0.30
      // 1 token input: 0.000001 * 0.075 = 0.000000075 → rounds to 0.000000 (0)
      // Use a value that produces a fractional result needing rounding
      // 333_333 input tokens: 0.333333 * 0.075 = 0.02499997... → round6 → 0.025
      const result = estimateCost(registry, 'google', 'gemini-1.5-flash', {
        inputTokens: 333_333,
        outputTokens: 0,
      });
      expect(result).toBeDefined();
      // Verify result has at most 6 decimal places
      const inputCostStr = result!.inputCost.toString();
      const decimalPart = inputCostStr.includes('.') ? inputCostStr.split('.')[1] : '';
      expect(decimalPart.length).toBeLessThanOrEqual(6);
    });

    it('returns exact values for round numbers', () => {
      // mistral-large: inputPerMTok=2.00, outputPerMTok=6.00
      // 1M input: 2.00 exactly, 1M output: 6.00 exactly
      const result = estimateCost(registry, 'mistral', 'mistral-large', {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(2.00);
      expect(result!.outputCost).toBe(6.00);
      expect(result!.totalCost).toBe(8.00);
    });
  });

  describe('resolves alias for estimation', () => {
    it('estimates cost using a model alias', () => {
      // gpt-4o-2024-11-20 is an alias for gpt-4o
      const byAlias = estimateCost(registry, 'openai', 'gpt-4o-2024-11-20', {
        inputTokens: 1_000_000,
        outputTokens: 0,
      });
      const byId = estimateCost(registry, 'openai', 'gpt-4o', {
        inputTokens: 1_000_000,
        outputTokens: 0,
      });
      expect(byAlias).toBeDefined();
      expect(byAlias!.inputCost).toBe(byId!.inputCost);
      expect(byAlias!.modelId).toBe('gpt-4o');
    });
  });
});
