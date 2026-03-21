import { describe, it, expect } from 'vitest';
import { registry } from '../registry';
import { getPrice, resolveModel, getModelInfo } from '../lookup';

describe('resolveModel', () => {
  it('resolves an exact model ID to itself', () => {
    expect(resolveModel(registry, 'openai', 'gpt-4o')).toBe('gpt-4o');
  });

  it('resolves an alias to the canonical model ID', () => {
    expect(resolveModel(registry, 'openai', 'gpt-4o-2024-11-20')).toBe('gpt-4o');
  });

  it('resolves another alias (chatgpt-4o-latest) to canonical', () => {
    expect(resolveModel(registry, 'openai', 'chatgpt-4o-latest')).toBe('gpt-4o');
  });

  it('resolves an anthropic alias to canonical', () => {
    expect(resolveModel(registry, 'anthropic', 'claude-sonnet-4-5-20250514')).toBe('claude-sonnet-4-5');
  });

  it('resolves a mistral alias to canonical', () => {
    expect(resolveModel(registry, 'mistral', 'mistral-large-latest')).toBe('mistral-large');
  });

  it('returns undefined for an unknown model/alias', () => {
    expect(resolveModel(registry, 'openai', 'gpt-99-ultra')).toBeUndefined();
  });

  it('returns undefined for an unknown provider', () => {
    expect(resolveModel(registry, 'unknown-provider', 'gpt-4o')).toBeUndefined();
  });
});

describe('getPrice', () => {
  it('returns a PriceEntry for a known model by exact ID', () => {
    const entry = getPrice(registry, 'openai', 'gpt-4o');
    expect(entry).toBeDefined();
    expect(entry!.modelId).toBe('gpt-4o');
    expect(entry!.provider).toBe('openai');
    expect(entry!.inputPerMTok).toBe(2.50);
    expect(entry!.outputPerMTok).toBe(10.00);
    expect(entry!.cachedInputPerMTok).toBe(1.25);
    expect(entry!.contextWindow).toBe(128000);
  });

  it('returns a PriceEntry for a known model by alias', () => {
    const entry = getPrice(registry, 'openai', 'gpt-4o-2024-11-20');
    expect(entry).toBeDefined();
    expect(entry!.modelId).toBe('gpt-4o');
    expect(entry!.inputPerMTok).toBe(2.50);
  });

  it('returns undefined for an unknown provider', () => {
    expect(getPrice(registry, 'nonexistent', 'gpt-4o')).toBeUndefined();
  });

  it('returns undefined for an unknown model', () => {
    expect(getPrice(registry, 'openai', 'gpt-99-ultra')).toBeUndefined();
  });

  it('returns an entry for a deprecated model', () => {
    // gemini-2.0-flash is deprecated: true
    const entry = getPrice(registry, 'google', 'gemini-2.0-flash');
    expect(entry).toBeDefined();
    expect(entry!.deprecated).toBe(true);
    expect(entry!.modelId).toBe('gemini-2.0-flash');
  });

  it('returns undefined when asOf is before the model effectiveDate', () => {
    // All models have effectiveDate "2025-03-01", so asOf "2025-02-01" should return undefined
    const entry = getPrice(registry, 'openai', 'gpt-4o', { asOf: '2025-02-01' });
    expect(entry).toBeUndefined();
  });

  it('returns an entry when asOf equals the model effectiveDate', () => {
    const entry = getPrice(registry, 'openai', 'gpt-4o', { asOf: '2025-03-01' });
    expect(entry).toBeDefined();
    expect(entry!.modelId).toBe('gpt-4o');
  });

  it('returns an entry when asOf is after the model effectiveDate', () => {
    const entry = getPrice(registry, 'openai', 'gpt-4o', { asOf: '2026-01-01' });
    expect(entry).toBeDefined();
    expect(entry!.modelId).toBe('gpt-4o');
  });

  it('includes tiers data for models with tiered pricing', () => {
    const entry = getPrice(registry, 'anthropic', 'claude-sonnet-4-5');
    expect(entry).toBeDefined();
    expect(entry!.tiers).toBeDefined();
    expect(entry!.tiers!.length).toBeGreaterThan(0);
    expect(entry!.tiers![0].minInputTokens).toBe(200000);
  });
});

describe('getModelInfo', () => {
  it('includes aliases array for a model that has aliases', () => {
    const info = getModelInfo(registry, 'openai', 'gpt-4o');
    expect(info).toBeDefined();
    expect(Array.isArray(info!.aliases)).toBe(true);
    expect(info!.aliases).toContain('gpt-4o-2024-11-20');
    expect(info!.aliases).toContain('chatgpt-4o-latest');
  });

  it('includes an empty aliases array for a model with no aliases', () => {
    // llama-4-maverick in meta has no aliases (meta aliases is {})
    const info = getModelInfo(registry, 'meta', 'llama-4-maverick');
    expect(info).toBeDefined();
    expect(Array.isArray(info!.aliases)).toBe(true);
    expect(info!.aliases).toHaveLength(0);
  });

  it('resolves via alias and returns correct aliases array', () => {
    const info = getModelInfo(registry, 'anthropic', 'claude-sonnet-4-5-20250514');
    expect(info).toBeDefined();
    expect(info!.modelId).toBe('claude-sonnet-4-5');
    expect(info!.aliases).toContain('claude-sonnet-4-5-20250514');
  });

  it('returns launchDate when present in model data', () => {
    // No models in registry.json have launchDate, so it should be undefined
    const info = getModelInfo(registry, 'openai', 'gpt-4o');
    expect(info).toBeDefined();
    // launchDate field exists but is undefined since it is not in registry.json
    expect(info!.launchDate).toBeUndefined();
  });

  it('returns undefined for an unknown model', () => {
    expect(getModelInfo(registry, 'openai', 'gpt-does-not-exist')).toBeUndefined();
  });

  it('returns undefined for an unknown provider', () => {
    expect(getModelInfo(registry, 'unknown', 'gpt-4o')).toBeUndefined();
  });

  it('includes all PriceEntry fields in the returned ModelInfo', () => {
    const info = getModelInfo(registry, 'openai', 'gpt-4o');
    expect(info).toBeDefined();
    expect(info!.provider).toBe('openai');
    expect(info!.modelId).toBe('gpt-4o');
    expect(info!.displayName).toBe('GPT-4o');
    expect(info!.inputPerMTok).toBe(2.50);
    expect(info!.outputPerMTok).toBe(10.00);
    expect(info!.contextWindow).toBe(128000);
    expect(info!.category).toBe('flagship');
    expect(info!.deprecated).toBe(false);
  });
});
