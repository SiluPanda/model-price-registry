import { PriceRegistry, ListModelsOptions, ModelSummary } from './types';

export function listProviders(registry: PriceRegistry): string[] {
  return Object.keys(registry.providers);
}

export function listModels(
  registry: PriceRegistry,
  options?: ListModelsOptions,
): ModelSummary[] {
  const results: ModelSummary[] = [];
  const providerFilter = options?.provider?.toLowerCase().trim();
  const categoryFilter = options?.category;
  const includeDeprecated = options?.includeDeprecated ?? true;

  for (const [providerId, providerData] of Object.entries(registry.providers)) {
    if (providerFilter && providerId !== providerFilter) continue;

    for (const modelData of Object.values(providerData.models)) {
      if (categoryFilter && modelData.category !== categoryFilter) continue;
      if (!includeDeprecated && modelData.deprecated) continue;

      results.push({
        provider: providerId,
        modelId: modelData.modelId,
        displayName: modelData.displayName,
        inputPerMTok: modelData.inputPerMTok,
        outputPerMTok: modelData.outputPerMTok,
        contextWindow: modelData.contextWindow,
        category: modelData.category,
        deprecated: modelData.deprecated,
      });
    }
  }

  const sortBy = options?.sortBy ?? 'name';
  switch (sortBy) {
    case 'name':
      results.sort((a, b) => a.modelId.localeCompare(b.modelId));
      break;
    case 'inputPrice':
      results.sort((a, b) => a.inputPerMTok - b.inputPerMTok);
      break;
    case 'outputPrice':
      results.sort((a, b) => a.outputPerMTok - b.outputPerMTok);
      break;
    case 'contextWindow':
      results.sort((a, b) => a.contextWindow - b.contextWindow);
      break;
  }

  return results;
}
