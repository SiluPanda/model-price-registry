import { PriceRegistry, RegistryMetadata } from './types';

export function getRegistryMetadata(registry: PriceRegistry): RegistryMetadata {
  let modelCount = 0;
  let oldestDate = '';
  let newestDate = '';

  for (const providerData of Object.values(registry.providers)) {
    for (const modelData of Object.values(providerData.models)) {
      modelCount++;
      const date = modelData.effectiveDate;
      if (!oldestDate || date < oldestDate) oldestDate = date;
      if (!newestDate || date > newestDate) newestDate = date;
    }
  }

  return {
    schemaVersion: registry.schemaVersion,
    lastUpdated: registry.lastUpdated,
    packageVersion: registry.packageVersion,
    providerCount: Object.keys(registry.providers).length,
    modelCount,
    oldestEffectiveDate: oldestDate,
    newestEffectiveDate: newestDate,
  };
}
