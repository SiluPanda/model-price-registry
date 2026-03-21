export type ModelCategory = 'flagship' | 'balanced' | 'fast' | 'reasoning' | 'code' | 'embedding' | 'legacy';

export interface PricingTier {
  minInputTokens: number;
  inputPerMTok: number;
  outputPerMTok: number;
}

export interface ModelPriceData {
  modelId: string;
  displayName: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok?: number;
  contextWindow: number;
  maxOutputTokens?: number;
  effectiveDate: string;
  deprecated: boolean;
  deprecatedDate?: string;
  successor?: string;
  launchDate?: string;
  tiers?: PricingTier[];
  category: ModelCategory;
}

export interface ProviderData {
  displayName: string;
  pricingUrl: string;
  models: Record<string, ModelPriceData>;
  aliases: Record<string, string>;
}

export interface PriceRegistry {
  schemaVersion: string;
  lastUpdated: string;
  packageVersion: string;
  providers: Record<string, ProviderData>;
}

export interface PriceEntry {
  provider: string;
  modelId: string;
  displayName: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok?: number;
  contextWindow: number;
  maxOutputTokens?: number;
  effectiveDate: string;
  deprecated: boolean;
  deprecatedDate?: string;
  successor?: string;
  category: ModelCategory;
  tiers?: PricingTier[];
}

export interface GetPriceOptions {
  asOf?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface CostEstimate {
  provider: string;
  modelId: string;
  inputCost: number;
  outputCost: number;
  cachedInputCost: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  currency: 'USD';
}

export interface ListModelsOptions {
  provider?: string;
  category?: ModelCategory;
  includeDeprecated?: boolean;
  sortBy?: 'name' | 'inputPrice' | 'outputPrice' | 'contextWindow';
}

export interface ModelSummary {
  provider: string;
  modelId: string;
  displayName: string;
  inputPerMTok: number;
  outputPerMTok: number;
  contextWindow: number;
  category: ModelCategory;
  deprecated: boolean;
}

export interface ModelInfo extends PriceEntry {
  aliases: string[];
  launchDate?: string;
}

export interface RegistryMetadata {
  schemaVersion: string;
  lastUpdated: string;
  packageVersion: string;
  providerCount: number;
  modelCount: number;
  oldestEffectiveDate: string;
  newestEffectiveDate: string;
}

export interface RegistryInstance {
  getPrice(provider: string, model: string, options?: GetPriceOptions): PriceEntry | undefined;
  estimateCost(provider: string, model: string, usage: TokenUsage): CostEstimate | undefined;
  listProviders(): string[];
  listModels(options?: ListModelsOptions): ModelSummary[];
  getModelInfo(provider: string, model: string): ModelInfo | undefined;
  resolveModel(provider: string, modelOrAlias: string): string | undefined;
  getRegistryMetadata(): RegistryMetadata;
  readonly registry: PriceRegistry;
}
