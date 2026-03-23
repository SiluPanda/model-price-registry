import { describe, it, expect } from 'vitest';
import {
  getPrice,
  estimateCost,
  listModels,
  resolveModel,
  createRegistry,
  getRegistryMetadata,
  registry,
} from '../index';

describe('getPrice — additional cases', () => {
  it('returns valid PriceEntry for every model in registry', () => {
    for (const [provId, prov] of Object.entries(registry.providers)) {
      for (const modelId of Object.keys(prov.models)) {
        const entry = getPrice(provId, modelId);
        expect(entry, `${provId}/${modelId}`).toBeDefined();
        expect(entry!.modelId).toBe(modelId);
        expect(entry!.provider).toBe(provId);
        expect(typeof entry!.inputPerMTok).toBe('number');
        expect(typeof entry!.outputPerMTok).toBe('number');
      }
    }
  });

  it('is case-insensitive for provider and model', () => {
    const entry = getPrice('OpenAI', 'GPT-4o');
    expect(entry).toBeDefined();
    expect(entry!.modelId).toBe('gpt-4o');
  });

  it('returns undefined for empty string provider/model', () => {
    expect(getPrice('', '')).toBeUndefined();
    expect(getPrice('openai', '')).toBeUndefined();
    expect(getPrice('', 'gpt-4o')).toBeUndefined();
  });
});

describe('resolveModel — case insensitivity', () => {
  it('resolves case-insensitively', () => {
    const result = resolveModel('OpenAI', 'GPT-4o');
    expect(result).toBe('gpt-4o');
  });
});

describe('estimateCost — edge cases', () => {
  it('handles cached token fallback for model without cachedInputPerMTok', () => {
    // Find a model without cachedInputPerMTok
    let testProvider: string | null = null;
    let testModel: string | null = null;
    for (const [provId, prov] of Object.entries(registry.providers)) {
      for (const [modelId, model] of Object.entries(prov.models)) {
        if (model.cachedInputPerMTok === undefined && model.inputPerMTok > 0) {
          testProvider = provId;
          testModel = modelId;
          break;
        }
      }
      if (testProvider) break;
    }

    if (testProvider && testModel) {
      const result = estimateCost(testProvider, testModel, {
        inputTokens: 1000,
        outputTokens: 500,
        cachedInputTokens: 200,
      });
      expect(result).toBeDefined();
      // Without cachedInputPerMTok, cached tokens should be billed at full input rate
      expect(result!.cachedInputCost).toBeGreaterThanOrEqual(0);
      expect(result!.totalCost).toBeGreaterThan(0);
    }
  });

  it('handles embedding models (0 output cost)', () => {
    // Find an embedding model
    let testProvider: string | null = null;
    let testModel: string | null = null;
    for (const [provId, prov] of Object.entries(registry.providers)) {
      for (const [modelId, model] of Object.entries(prov.models)) {
        if (model.category === 'embedding') {
          testProvider = provId;
          testModel = modelId;
          break;
        }
      }
      if (testProvider) break;
    }

    if (testProvider && testModel) {
      const result = estimateCost(testProvider, testModel, {
        inputTokens: 1000,
        outputTokens: 0,
      });
      expect(result).toBeDefined();
      expect(result!.outputCost).toBe(0);
    }
  });
});

describe('listModels — additional cases', () => {
  it('returns empty array for unknown provider', () => {
    const result = listModels({ provider: 'nonexistent-provider-xyz' });
    expect(result).toEqual([]);
  });

  it('sorts by outputPrice', () => {
    const result = listModels({ sortBy: 'outputPrice' });
    expect(result.length).toBeGreaterThan(0);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].outputPerMTok).toBeGreaterThanOrEqual(result[i - 1].outputPerMTok);
    }
  });
});

describe('createRegistry', () => {
  it('creates a working instance from custom data', () => {
    const customData = {
      schemaVersion: '1.0.0',
      lastUpdated: '2024-01-01T00:00:00Z',
      packageVersion: '0.0.1',
      providers: {
        'test-provider': {
          displayName: 'Test Provider',
          pricingUrl: 'https://test.com/pricing',
          models: {
            'test-model': {
              modelId: 'test-model',
              displayName: 'Test Model',
              inputPerMTok: 1.0,
              outputPerMTok: 2.0,
              contextWindow: 4096,
              effectiveDate: '2024-01-01',
              deprecated: false,
              category: 'fast' as const,
            },
          },
          aliases: {},
        },
      },
    };
    const custom = createRegistry(customData);
    const entry = custom.getPrice('test-provider', 'test-model');
    expect(entry).toBeDefined();
    expect(entry!.inputPerMTok).toBe(1.0);
    expect(entry!.outputPerMTok).toBe(2.0);
  });

  it('custom registry does not affect default registry', () => {
    const customData = {
      schemaVersion: '1.0.0',
      lastUpdated: '2024-01-01T00:00:00Z',
      packageVersion: '0.0.1',
      providers: {
        'custom-only': {
          displayName: 'Custom',
          pricingUrl: 'https://custom.com',
          models: {
            'custom-model': {
              modelId: 'custom-model',
              displayName: 'Custom',
              inputPerMTok: 99,
              outputPerMTok: 99,
              contextWindow: 1024,
              effectiveDate: '2024-01-01',
              deprecated: false,
              category: 'fast' as const,
            },
          },
          aliases: {},
        },
      },
    };
    createRegistry(customData);
    // Default registry should not contain the custom model
    expect(getPrice('custom-only', 'custom-model')).toBeUndefined();
    // Default registry should still work
    expect(getPrice('openai', 'gpt-4o')).toBeDefined();
  });
});

describe('getRegistryMetadata', () => {
  it('returns correct structure with all fields', () => {
    const meta = getRegistryMetadata();
    expect(meta).toHaveProperty('schemaVersion');
    expect(meta).toHaveProperty('lastUpdated');
    expect(meta).toHaveProperty('packageVersion');
    expect(meta).toHaveProperty('providerCount');
    expect(meta).toHaveProperty('modelCount');
    expect(meta).toHaveProperty('oldestEffectiveDate');
    expect(meta).toHaveProperty('newestEffectiveDate');
  });

  it('counts are accurate', () => {
    const meta = getRegistryMetadata();
    const actualProviders = Object.keys(registry.providers).length;
    let actualModels = 0;
    for (const prov of Object.values(registry.providers)) {
      actualModels += Object.keys(prov.models).length;
    }
    expect(meta.providerCount).toBe(actualProviders);
    expect(meta.modelCount).toBe(actualModels);
  });
});

describe('registry immutability', () => {
  it('registry export is frozen', () => {
    expect(Object.isFrozen(registry)).toBe(true);
  });
});
