# model-price-registry

Auto-updating registry of LLM pricing across providers.

## Installation

```bash
npm install model-price-registry
```

## Quick Start

```typescript
import {
  getPrice,
  estimateCost,
  listModels,
  listProviders,
} from 'model-price-registry';

// Look up pricing for a model
const price = getPrice('openai', 'gpt-4o');
console.log(price);
// { provider: 'openai', modelId: 'gpt-4o', inputPerMTok: 2.5, outputPerMTok: 10, ... }

// Estimate cost for a specific usage
const cost = estimateCost('anthropic', 'claude-sonnet-4', {
  inputTokens: 50_000,
  outputTokens: 5_000,
  cachedInputTokens: 10_000,
});
console.log(cost);
// { inputCost: 0.15, outputCost: 0.075, cachedInputCost: 0.015, totalCost: 0.24, ... }

// List all available providers
const providers = listProviders();
console.log(providers);
// ['openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere']

// List models with filtering and sorting
const models = listModels({ provider: 'openai', sortBy: 'inputPrice' });
console.log(models);
```

## Supported Providers

- **OpenAI** — GPT-4o, GPT-4.1, o3, o4-mini, and more
- **Anthropic** — Claude Opus 4, Claude Sonnet 4, Claude Haiku 3.5, and more
- **Google** — Gemini 2.5 Pro, Gemini 2.5 Flash, and more
- **Meta** — Llama 4 Maverick, Llama 4 Scout, Llama 3.x series
- **Mistral** — Mistral Large, Codestral, Pixtral Large, and more
- **Cohere** — Command R+, Command R, Embed v3, Rerank v3

## API Reference

### `getPrice(provider, model, options?)`

Look up pricing for a specific model. Resolves aliases and is case-insensitive.

```typescript
function getPrice(
  provider: string,
  model: string,
  options?: GetPriceOptions,
): PriceEntry | undefined;
```

- `options.asOf` — Return pricing effective on or before this ISO 8601 date string.
- Returns `undefined` if the provider or model is not found.

### `estimateCost(provider, model, usage)`

Estimate the cost of a specific token usage. Supports tiered pricing and cached input tokens.

```typescript
function estimateCost(
  provider: string,
  model: string,
  usage: TokenUsage,
): CostEstimate | undefined;
```

- When a model has pricing tiers (e.g., long-context pricing), the highest applicable tier is used.
- When `cachedInputTokens` is provided but the model has no cached rate, tokens are billed at the full input rate.
- All cost values are rounded to 6 decimal places.

### `listProviders()`

Return an array of all provider ID strings.

```typescript
function listProviders(): string[];
```

### `listModels(options?)`

Return a list of model summaries with optional filtering and sorting.

```typescript
function listModels(options?: ListModelsOptions): ModelSummary[];
```

- `options.provider` — Filter by provider ID.
- `options.category` — Filter by model category.
- `options.includeDeprecated` — Include deprecated models (default: `true`).
- `options.sortBy` — Sort by `'name'` (default), `'inputPrice'`, `'outputPrice'`, or `'contextWindow'`.

### `getModelInfo(provider, model)`

Return detailed model information including aliases and launch date.

```typescript
function getModelInfo(
  provider: string,
  model: string,
): ModelInfo | undefined;
```

### `resolveModel(provider, modelOrAlias)`

Resolve an alias to its canonical model ID. Returns `undefined` if not found.

```typescript
function resolveModel(
  provider: string,
  modelOrAlias: string,
): string | undefined;
```

### `getRegistryMetadata()`

Return metadata about the registry including provider and model counts, date ranges, and version info.

```typescript
function getRegistryMetadata(): RegistryMetadata;
```

### `createRegistry(data)`

Create a custom registry instance from your own pricing data.

```typescript
function createRegistry(data: PriceRegistry): RegistryInstance;
```

## Types

The following types are exported for TypeScript consumers:

- `PriceRegistry` — Top-level registry structure
- `ProviderData` — Provider metadata and model map
- `ModelPriceData` — Raw model pricing data
- `PriceEntry` — Return type of `getPrice`
- `PricingTier` — Long-context pricing tier
- `ModelCategory` — `'flagship' | 'balanced' | 'fast' | 'reasoning' | 'code' | 'embedding' | 'legacy'`
- `GetPriceOptions` — Options for `getPrice`
- `TokenUsage` — Input for `estimateCost`
- `CostEstimate` — Return type of `estimateCost`
- `ListModelsOptions` — Options for `listModels`
- `ModelSummary` — Return type of `listModels`
- `ModelInfo` — Return type of `getModelInfo`
- `RegistryMetadata` — Return type of `getRegistryMetadata`
- `RegistryInstance` — Interface for custom registry instances

## License

MIT
