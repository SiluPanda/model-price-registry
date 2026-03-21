import {
  PriceRegistry,
  PriceEntry,
  GetPriceOptions,
  ModelInfo,
} from './types';

export function resolveModel(
  registry: PriceRegistry,
  provider: string,
  modelOrAlias: string,
): string | undefined {
  const p = provider.toLowerCase().trim();
  const m = modelOrAlias.toLowerCase().trim();
  const providerData = registry.providers[p];
  if (!providerData) return undefined;
  if (providerData.models[m]) return m;
  const canonical = providerData.aliases[m];
  if (canonical && providerData.models[canonical]) return canonical;
  return undefined;
}

export function getPrice(
  registry: PriceRegistry,
  provider: string,
  model: string,
  options?: GetPriceOptions,
): PriceEntry | undefined {
  const p = provider.toLowerCase().trim();
  const resolved = resolveModel(registry, p, model);
  if (!resolved) return undefined;
  const providerData = registry.providers[p];
  const modelData = providerData.models[resolved];

  // asOf check: if asOf is provided and the model's effectiveDate is after asOf, return undefined
  if (options?.asOf && modelData.effectiveDate > options.asOf) {
    return undefined;
  }

  return {
    provider: p,
    modelId: resolved,
    displayName: modelData.displayName,
    inputPerMTok: modelData.inputPerMTok,
    outputPerMTok: modelData.outputPerMTok,
    cachedInputPerMTok: modelData.cachedInputPerMTok,
    contextWindow: modelData.contextWindow,
    maxOutputTokens: modelData.maxOutputTokens,
    effectiveDate: modelData.effectiveDate,
    deprecated: modelData.deprecated,
    deprecatedDate: modelData.deprecatedDate,
    successor: modelData.successor,
    category: modelData.category,
    tiers: modelData.tiers,
  };
}

export function getModelInfo(
  registry: PriceRegistry,
  provider: string,
  model: string,
): ModelInfo | undefined {
  const entry = getPrice(registry, provider, model);
  if (!entry) return undefined;
  const providerData = registry.providers[entry.provider];

  // Reverse-lookup aliases
  const aliases: string[] = [];
  for (const [alias, canonical] of Object.entries(providerData.aliases)) {
    if (canonical === entry.modelId) {
      aliases.push(alias);
    }
  }

  const modelData = providerData.models[entry.modelId];
  return {
    ...entry,
    aliases,
    launchDate: modelData.launchDate,
  };
}
