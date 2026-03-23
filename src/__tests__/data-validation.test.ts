import { describe, it, expect } from 'vitest';
import { registry } from '../registry';
import type { ModelCategory, PriceRegistry, ModelPriceData } from '../types';

const VALID_CATEGORIES: ModelCategory[] = ['flagship', 'balanced', 'fast', 'reasoning', 'code', 'embedding', 'legacy'];
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

function forEachModel(
  reg: PriceRegistry,
  fn: (provider: string, modelId: string, model: ModelPriceData) => void,
): void {
  for (const [provId, prov] of Object.entries(reg.providers)) {
    for (const [modelId, model] of Object.entries(prov.models)) {
      fn(provId, modelId, model);
    }
  }
}

describe('registry data validation', () => {
  it('every model has all required fields', () => {
    forEachModel(registry, (provider, modelId, model) => {
      expect(model.modelId, `${provider}/${modelId} missing modelId`).toBe(modelId);
      expect(typeof model.displayName, `${provider}/${modelId} displayName`).toBe('string');
      expect(typeof model.inputPerMTok, `${provider}/${modelId} inputPerMTok`).toBe('number');
      expect(typeof model.outputPerMTok, `${provider}/${modelId} outputPerMTok`).toBe('number');
      expect(typeof model.contextWindow, `${provider}/${modelId} contextWindow`).toBe('number');
      expect(typeof model.effectiveDate, `${provider}/${modelId} effectiveDate`).toBe('string');
      expect(typeof model.deprecated, `${provider}/${modelId} deprecated`).toBe('boolean');
      expect(typeof model.category, `${provider}/${modelId} category`).toBe('string');
    });
  });

  it('inputPerMTok and outputPerMTok are non-negative for every model', () => {
    forEachModel(registry, (provider, modelId, model) => {
      expect(model.inputPerMTok, `${provider}/${modelId} inputPerMTok`).toBeGreaterThanOrEqual(0);
      expect(model.outputPerMTok, `${provider}/${modelId} outputPerMTok`).toBeGreaterThanOrEqual(0);
    });
  });

  it('contextWindow is a positive integer for every model', () => {
    forEachModel(registry, (provider, modelId, model) => {
      expect(model.contextWindow, `${provider}/${modelId} contextWindow`).toBeGreaterThan(0);
      expect(Number.isInteger(model.contextWindow), `${provider}/${modelId} contextWindow isInteger`).toBe(true);
    });
  });

  it('effectiveDate is valid YYYY-MM-DD for every model', () => {
    forEachModel(registry, (provider, modelId, model) => {
      expect(model.effectiveDate, `${provider}/${modelId} effectiveDate format`).toMatch(ISO_DATE_REGEX);
      expect(isNaN(new Date(model.effectiveDate).getTime()), `${provider}/${modelId} effectiveDate valid`).toBe(false);
    });
  });

  it('deprecated is a boolean for every model', () => {
    forEachModel(registry, (provider, modelId, model) => {
      expect(typeof model.deprecated, `${provider}/${modelId} deprecated type`).toBe('boolean');
    });
  });

  it('deprecated models have a deprecatedDate', () => {
    forEachModel(registry, (provider, modelId, model) => {
      if (model.deprecated) {
        expect(model.deprecatedDate, `${provider}/${modelId} deprecatedDate`).toBeDefined();
        expect(model.deprecatedDate!, `${provider}/${modelId} deprecatedDate format`).toMatch(ISO_DATE_REGEX);
      }
    });
  });

  it('successor references a valid model ID within the same provider', () => {
    for (const [provId, prov] of Object.entries(registry.providers)) {
      for (const [modelId, model] of Object.entries(prov.models)) {
        if (model.successor) {
          expect(
            prov.models[model.successor],
            `${provId}/${modelId} successor "${model.successor}" does not exist`,
          ).toBeDefined();
        }
      }
    }
  });

  it('all aliases point to existing canonical model IDs', () => {
    for (const [provId, prov] of Object.entries(registry.providers)) {
      for (const [alias, canonical] of Object.entries(prov.aliases)) {
        expect(
          prov.models[canonical],
          `${provId} alias "${alias}" -> "${canonical}" does not exist in models`,
        ).toBeDefined();
      }
    }
  });

  it('no duplicate aliases within a provider', () => {
    for (const [provId, prov] of Object.entries(registry.providers)) {
      const aliasKeys = Object.keys(prov.aliases);
      const unique = new Set(aliasKeys);
      expect(unique.size, `${provId} has duplicate aliases`).toBe(aliasKeys.length);
    }
  });

  it('no canonical model ID appears as an alias', () => {
    for (const [provId, prov] of Object.entries(registry.providers)) {
      const modelIds = new Set(Object.keys(prov.models));
      for (const alias of Object.keys(prov.aliases)) {
        expect(modelIds.has(alias), `${provId}: "${alias}" is both a model ID and alias`).toBe(false);
      }
    }
  });

  it('schemaVersion follows semver format', () => {
    expect(registry.schemaVersion).toMatch(SEMVER_REGEX);
  });

  it('lastUpdated is a valid ISO 8601 timestamp', () => {
    expect(isNaN(new Date(registry.lastUpdated).getTime())).toBe(false);
  });

  it('category values are valid for every model', () => {
    forEachModel(registry, (provider, modelId, model) => {
      expect(VALID_CATEGORIES, `${provider}/${modelId} invalid category "${model.category}"`).toContain(model.category);
    });
  });

  it('no inputPerMTok exceeds $200', () => {
    forEachModel(registry, (provider, modelId, model) => {
      expect(model.inputPerMTok, `${provider}/${modelId} inputPerMTok > $200`).toBeLessThanOrEqual(200);
    });
  });

  it('pricing tiers have minInputTokens in ascending order', () => {
    forEachModel(registry, (provider, modelId, model) => {
      if (model.tiers && model.tiers.length > 1) {
        for (let i = 1; i < model.tiers.length; i++) {
          expect(
            model.tiers[i].minInputTokens,
            `${provider}/${modelId} tier ${i} not ascending`,
          ).toBeGreaterThan(model.tiers[i - 1].minInputTokens);
        }
      }
    });
  });

  it('embedding models have outputPerMTok of 0', () => {
    forEachModel(registry, (provider, modelId, model) => {
      if (model.category === 'embedding') {
        expect(model.outputPerMTok, `${provider}/${modelId} embedding outputPerMTok`).toBe(0);
      }
    });
  });
});
