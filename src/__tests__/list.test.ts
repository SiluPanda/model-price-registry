import { describe, it, expect } from 'vitest';
import { registry } from '../registry';
import { listProviders, listModels } from '../list';

describe('listProviders', () => {
  it('returns an array of all 6 provider IDs', () => {
    const providers = listProviders(registry);
    expect(Array.isArray(providers)).toBe(true);
    expect(providers).toHaveLength(6);
  });

  it('contains openai', () => {
    expect(listProviders(registry)).toContain('openai');
  });

  it('contains anthropic', () => {
    expect(listProviders(registry)).toContain('anthropic');
  });

  it('contains google', () => {
    expect(listProviders(registry)).toContain('google');
  });

  it('contains meta', () => {
    expect(listProviders(registry)).toContain('meta');
  });

  it('contains mistral', () => {
    expect(listProviders(registry)).toContain('mistral');
  });

  it('contains cohere', () => {
    expect(listProviders(registry)).toContain('cohere');
  });
});

describe('listModels', () => {
  describe('no options', () => {
    it('returns all models when no options are provided', () => {
      const models = listModels(registry);
      // OpenAI: 11, Anthropic: 6, Google: 5, Meta: 5, Mistral: 6, Cohere: 7 = 40
      expect(models.length).toBeGreaterThan(0);
      // Should include models from all providers
      const providers = new Set(models.map((m) => m.provider));
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('google');
      expect(providers).toContain('meta');
      expect(providers).toContain('mistral');
      expect(providers).toContain('cohere');
    });

    it('includes deprecated models by default', () => {
      const models = listModels(registry);
      const deprecated = models.filter((m) => m.deprecated);
      // gemini-2.0-flash is deprecated in registry.json
      expect(deprecated.length).toBeGreaterThan(0);
    });
  });

  describe('filter by provider', () => {
    it('returns only openai models when filtered by openai', () => {
      const models = listModels(registry, { provider: 'openai' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'openai')).toBe(true);
    });

    it('returns only anthropic models when filtered by anthropic', () => {
      const models = listModels(registry, { provider: 'anthropic' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'anthropic')).toBe(true);
    });

    it('returns only google models when filtered by google', () => {
      const models = listModels(registry, { provider: 'google' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'google')).toBe(true);
    });

    it('returns only meta models when filtered by meta', () => {
      const models = listModels(registry, { provider: 'meta' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'meta')).toBe(true);
    });

    it('returns correct model IDs for openai provider', () => {
      const models = listModels(registry, { provider: 'openai' });
      const ids = models.map((m) => m.modelId);
      expect(ids).toContain('gpt-4o');
      expect(ids).toContain('gpt-4o-mini');
      expect(ids).toContain('o3');
    });
  });

  describe('filter by category', () => {
    it('returns only flagship models when filtered by flagship', () => {
      const models = listModels(registry, { category: 'flagship' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.category === 'flagship')).toBe(true);
    });

    it('returns only fast models when filtered by fast', () => {
      const models = listModels(registry, { category: 'fast' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.category === 'fast')).toBe(true);
    });

    it('returns only reasoning models when filtered by reasoning', () => {
      const models = listModels(registry, { category: 'reasoning' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.category === 'reasoning')).toBe(true);
    });

    it('returns only embedding models when filtered by embedding', () => {
      const models = listModels(registry, { category: 'embedding' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.category === 'embedding')).toBe(true);
    });

    it('can combine provider and category filters', () => {
      const models = listModels(registry, { provider: 'openai', category: 'flagship' });
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'openai' && m.category === 'flagship')).toBe(true);
    });
  });

  describe('includeDeprecated filter', () => {
    it('excludes deprecated models when includeDeprecated is false', () => {
      const models = listModels(registry, { includeDeprecated: false });
      expect(models.every((m) => !m.deprecated)).toBe(true);
    });

    it('includes deprecated models when includeDeprecated is true', () => {
      const withDeprecated = listModels(registry, { includeDeprecated: true });
      const withoutDeprecated = listModels(registry, { includeDeprecated: false });
      // gemini-2.0-flash is deprecated, so withDeprecated should have more models
      expect(withDeprecated.length).toBeGreaterThan(withoutDeprecated.length);
    });

    it('includes gemini-2.0-flash when includeDeprecated is true', () => {
      const models = listModels(registry, { includeDeprecated: true });
      expect(models.some((m) => m.modelId === 'gemini-2.0-flash')).toBe(true);
    });

    it('excludes gemini-2.0-flash when includeDeprecated is false', () => {
      const models = listModels(registry, { includeDeprecated: false });
      expect(models.some((m) => m.modelId === 'gemini-2.0-flash')).toBe(false);
    });
  });

  describe('sorting', () => {
    it('sorts by name (modelId) alphabetically by default', () => {
      const models = listModels(registry);
      for (let i = 1; i < models.length; i++) {
        expect(models[i - 1].modelId.localeCompare(models[i].modelId)).toBeLessThanOrEqual(0);
      }
    });

    it('sorts by name when sortBy is explicitly "name"', () => {
      const models = listModels(registry, { sortBy: 'name' });
      for (let i = 1; i < models.length; i++) {
        expect(models[i - 1].modelId.localeCompare(models[i].modelId)).toBeLessThanOrEqual(0);
      }
    });

    it('first model alphabetically is claude-haiku-3-5', () => {
      const models = listModels(registry, { sortBy: 'name' });
      expect(models[0].modelId).toBe('claude-haiku-3-5');
    });

    it('sorts by inputPrice ascending', () => {
      const models = listModels(registry, { sortBy: 'inputPrice' });
      for (let i = 1; i < models.length; i++) {
        expect(models[i - 1].inputPerMTok).toBeLessThanOrEqual(models[i].inputPerMTok);
      }
    });

    it('cheapest model by inputPrice is mistral-nemo ($0.02/MTok)', () => {
      const models = listModels(registry, { sortBy: 'inputPrice' });
      expect(models[0].modelId).toBe('mistral-nemo');
      expect(models[0].inputPerMTok).toBe(0.02);
    });

    it('sorts by contextWindow ascending', () => {
      const models = listModels(registry, { sortBy: 'contextWindow' });
      for (let i = 1; i < models.length; i++) {
        expect(models[i - 1].contextWindow).toBeLessThanOrEqual(models[i].contextWindow);
      }
    });

    it('smallest contextWindow models are cohere embed models (512 tokens)', () => {
      const models = listModels(registry, { sortBy: 'contextWindow' });
      expect(models[0].contextWindow).toBe(512);
    });
  });

  describe('ModelSummary shape', () => {
    it('all returned ModelSummary objects have required fields', () => {
      const models = listModels(registry);
      for (const model of models) {
        expect(typeof model.provider).toBe('string');
        expect(typeof model.modelId).toBe('string');
        expect(typeof model.displayName).toBe('string');
        expect(typeof model.inputPerMTok).toBe('number');
        expect(typeof model.outputPerMTok).toBe('number');
        expect(typeof model.contextWindow).toBe('number');
        expect(typeof model.category).toBe('string');
        expect(typeof model.deprecated).toBe('boolean');
      }
    });

    it('ModelSummary does not contain aliases or tiers (is a summary type)', () => {
      const models = listModels(registry);
      for (const model of models) {
        expect((model as Record<string, unknown>)['aliases']).toBeUndefined();
        expect((model as Record<string, unknown>)['tiers']).toBeUndefined();
      }
    });
  });
});
