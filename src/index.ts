import defaultInstance, { registry, createRegistry } from './registry';

const {
  getPrice,
  estimateCost,
  listProviders,
  listModels,
  getModelInfo,
  resolveModel,
  getRegistryMetadata,
} = defaultInstance;

export {
  getPrice,
  estimateCost,
  listProviders,
  listModels,
  getModelInfo,
  resolveModel,
  getRegistryMetadata,
  createRegistry,
  registry,
};

export type {
  PriceRegistry,
  ProviderData,
  ModelPriceData,
  PriceEntry,
  PricingTier,
  ModelCategory,
  GetPriceOptions,
  TokenUsage,
  CostEstimate,
  ListModelsOptions,
  ModelSummary,
  ModelInfo,
  RegistryMetadata,
  RegistryInstance,
} from './types';
