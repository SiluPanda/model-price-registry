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
  return {
    getPrice: (provider: string, model: string, options?: GetPriceOptions) =>
      getPrice(data, provider, model, options),
    estimateCost: (provider: string, model: string, usage: TokenUsage) =>
      estimateCost(data, provider, model, usage),
    listProviders: () => listProviders(data),
    listModels: (options?: ListModelsOptions) => listModels(data, options),
    getModelInfo: (provider: string, model: string) =>
      getModelInfo(data, provider, model),
    resolveModel: (provider: string, modelOrAlias: string) =>
      resolveModel(data, provider, modelOrAlias),
    getRegistryMetadata: () => getRegistryMetadata(data),
    registry: data,
  };
}

const defaultInstance = createRegistry(frozenRegistry);

export { frozenRegistry as registry };
export default defaultInstance;
