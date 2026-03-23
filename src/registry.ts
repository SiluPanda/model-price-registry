import type {
  PriceRegistry,
  GetPriceOptions,
  TokenUsage,
  ListModelsOptions,
  RegistryInstance,
} from './types';
import { resolveModel, getPrice, getModelInfo } from './lookup';
import { estimateCost } from './estimate';
import { listProviders, listModels } from './list';
import { getRegistryMetadata } from './metadata';
import registryData from './data/registry.json';

function deepFreeze<T extends object>(obj: T): T {
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  }
  return obj;
}

const frozenRegistry: PriceRegistry = deepFreeze(registryData as unknown as PriceRegistry);

export function createRegistry(data: PriceRegistry): RegistryInstance {
  const frozen = deepFreeze(data);
  return {
    getPrice: (provider: string, model: string, options?: GetPriceOptions) =>
      getPrice(frozen, provider, model, options),
    estimateCost: (provider: string, model: string, usage: TokenUsage) =>
      estimateCost(frozen, provider, model, usage),
    listProviders: () => listProviders(frozen),
    listModels: (options?: ListModelsOptions) => listModels(frozen, options),
    getModelInfo: (provider: string, model: string) =>
      getModelInfo(frozen, provider, model),
    resolveModel: (provider: string, modelOrAlias: string) =>
      resolveModel(frozen, provider, modelOrAlias),
    getRegistryMetadata: () => getRegistryMetadata(frozen),
    registry: frozen,
  };
}

const defaultInstance = createRegistry(frozenRegistry);

export { frozenRegistry as registry };
export default defaultInstance;
